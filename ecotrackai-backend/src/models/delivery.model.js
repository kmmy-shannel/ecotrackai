// ============================================================
// FILE: src/models/delivery.model.js
// ============================================================
const pool = require('../config/database');

const DeliveryModel = {
  async _getTableColumns(tableName) {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
    `, [tableName]);
    return result.rows.map((row) => row.column_name);
  },

  // ── List all routes for a business ──────────────────────
  async findAllByBusiness(businessId) {
    try {
      const result = await pool.query(`
        SELECT
          dr.*,
          u.full_name AS driver_full_name,
          COALESCE(
            (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = dr.route_id),
            0
          ) AS stop_count
        FROM delivery_routes dr
        LEFT JOIN users u ON dr.driver_user_id = u.user_id
        WHERE dr.business_id = $1
        ORDER BY dr.created_at DESC
      `, [businessId]);
      return { success: true, data: result.rows };
    } catch (err) {
      console.error('[DeliveryModel.findAllByBusiness]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── List routes assigned to a driver ────────────────────
  async findByDriverUserId(driverUserId) {
    try {
      const result = await pool.query(`
        SELECT
          dr.*,
          u.full_name AS driver_full_name,
          COALESCE(
            (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = dr.route_id),
            0
          ) AS stop_count
        FROM delivery_routes dr
        LEFT JOIN users u ON dr.driver_user_id = u.user_id
        WHERE dr.driver_user_id = $1
        ORDER BY dr.created_at DESC
      `, [driverUserId]);
      return { success: true, data: result.rows };
    } catch (err) {
      console.error('[DeliveryModel.findByDriverUserId]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Find a single route ──────────────────────────────────
  async findById(routeId, businessId) {
    try {
      const result = await pool.query(`
        SELECT
          dr.*,
          u.full_name AS driver_full_name
        FROM delivery_routes dr
        LEFT JOIN users u ON dr.driver_user_id = u.user_id
        WHERE dr.route_id = $1 AND dr.business_id = $2
      `, [routeId, businessId]);

      if (result.rows.length === 0)
        return { success: false, error: 'Route not found' };

      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.findById]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Create a route ───────────────────────────────────────
  async create(businessId, data) {
    try {
      const {
        routeName, routeType, originLocation, destinationLocation,
        vehicleType, driverUserId,
        totalDistanceKm, estimatedDurationMinutes,
        estimatedFuelConsumptionLiters, estimatedCarbonKg
      } = data;

      const result = await pool.query(`
        INSERT INTO delivery_routes (
          business_id, route_name, route_type,
          origin_location, destination_location,
          vehicle_type, driver_user_id,
          total_distance_km, estimated_duration_minutes,
          estimated_fuel_consumption_liters, estimated_carbon_kg,
          status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'planned',NOW())
        RETURNING *
      `, [
        businessId,
        routeName,
        routeType || 'single',
        JSON.stringify(originLocation  || {}),
        JSON.stringify(destinationLocation || {}),
        vehicleType,
        driverUserId || null,
        Math.floor(totalDistanceKm * 100) / 100 || 0,
        Math.floor(estimatedDurationMinutes) || 0,
        Math.floor(estimatedFuelConsumptionLiters) || 0,
        Math.floor(estimatedCarbonKg) || 0,
      ]);

      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.create]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Create a stop ────────────────────────────────────────
  async createStop(routeId, stopData) {
    try {
      const {
        stopSequence, locationName, location,
        stopType = 'stop', plannedArrivalTime, notes
      } = stopData;

      const locObj = location || {};
      const name   = locationName
        || locObj.address || locObj.name
        || `Stop ${stopSequence}`;

      const columns = await this._getTableColumns('route_stops');
      const valueByColumn = {
        route_id: routeId,
        delivery_id: routeId,
        stop_sequence: stopSequence,
        sequence: stopSequence,
        sequence_no: stopSequence,
        stop_order: stopSequence,
        location_name: name,
        stop_name: name,
        location: JSON.stringify(locObj),
        location_json: JSON.stringify(locObj),
        stop_type: stopType,
        planned_arrival_time: plannedArrivalTime || null,
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertColumns = columns.filter((column) =>
        Object.prototype.hasOwnProperty.call(valueByColumn, column)
      );

      if (
        !(insertColumns.includes('route_id') || insertColumns.includes('delivery_id')) ||
        !(insertColumns.includes('stop_sequence') || insertColumns.includes('sequence') || insertColumns.includes('sequence_no') || insertColumns.includes('stop_order'))
      ) {
        return { success: false, error: 'route_stops required columns not found' };
      }

      const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
      const values = insertColumns.map((column) => valueByColumn[column]);

      const result = await pool.query(`
        INSERT INTO route_stops (${insertColumns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `, values);

      // Safety net: ensure location_name is always saved even if dynamic insert missed it
      const insertedRow = result.rows[0];
      if (insertedRow && (insertedRow.location_name === null || insertedRow.location_name === undefined)) {
        try {
          await pool.query(
            `UPDATE route_stops SET location_name = $1 WHERE stop_id = $2`,
            [name, insertedRow.stop_id]
          );
          insertedRow.location_name = name;
        } catch (_) { /* non-fatal */ }
      }
      return { success: true, data: insertedRow };
    } catch (err) {
      console.error('[DeliveryModel.createStop]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Get all stops for a route ────────────────────────────
  async getStops(routeId) {
    try {
      const result = await pool.query(`
        SELECT * FROM route_stops
        WHERE route_id = $1
        ORDER BY stop_sequence ASC
      `, [routeId]);

      const normalized = result.rows.map((row) => {
        let location = row.location ?? row.location_json ?? null;
        if (location && typeof location !== 'string') {
          location = JSON.stringify(location);
        }
        return {
          ...row,
          location,
          location_name: row.location_name || row.stop_name || null,
          stop_sequence: row.stop_sequence ?? row.sequence_no ?? row.sequence ?? row.stop_order ?? 0
        };
      }).sort((a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0));

      return { success: true, data: normalized };
    } catch (err) {
      console.error('[DeliveryModel.getStops]', err.message);
      return { success: true, data: [] };
    }
  },

  // ── Update a stop ────────────────────────────────────────
  async updateStop(stopId, routeId, updates) {
    try {
      const {
        actualArrivalTime, actualDepartureTime,
        productsDelivered, notes
      } = updates;

      const result = await pool.query(`
        UPDATE route_stops
        SET
          actual_arrival_time   = COALESCE($1, actual_arrival_time),
          actual_departure_time = COALESCE($2, actual_departure_time),
          products_delivered    = COALESCE($3::jsonb, products_delivered),
          notes                 = COALESCE($4, notes)
        WHERE stop_id = $5 AND route_id = $6
        RETURNING *
      `, [
        actualArrivalTime   || null,
        actualDepartureTime || null,
        productsDelivered   ? JSON.stringify(productsDelivered) : null,
        notes               || null,
        stopId,
        routeId,
      ]);

      if (result.rows.length === 0)
        return { success: false, error: 'Stop not found' };

      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.updateStop]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Save / upsert optimization ───────────────────────────
  async saveOptimization(routeId, businessId, opt) {
    try {
      const result = await pool.query(`
        INSERT INTO route_optimizations (
          route_id, business_id,
          original_distance_km,      optimized_distance_km,
          original_duration_minutes, optimized_duration_minutes,
          original_fuel_liters,      optimized_fuel_liters,
          original_carbon_kg,        optimized_carbon_kg,
          savings_km, savings_fuel,  savings_co2,
          ai_recommendation, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',NOW())
        ON CONFLICT (route_id) DO UPDATE SET
          optimized_distance_km      = EXCLUDED.optimized_distance_km,
          optimized_duration_minutes = EXCLUDED.optimized_duration_minutes,
          optimized_fuel_liters      = EXCLUDED.optimized_fuel_liters,
          optimized_carbon_kg        = EXCLUDED.optimized_carbon_kg,
          savings_km                 = EXCLUDED.savings_km,
          savings_fuel               = EXCLUDED.savings_fuel,
          savings_co2                = EXCLUDED.savings_co2,
          ai_recommendation          = EXCLUDED.ai_recommendation,
          status                     = 'pending'
        RETURNING *
      `, [
        routeId, businessId,
        opt.originalDistance,  opt.optimizedDistance,
        opt.originalDuration,  opt.optimizedDuration,
        opt.originalFuel,      opt.optimizedFuel,
        opt.originalCarbon,    opt.optimizedCarbon,
        opt.savingsKm,         opt.savingsFuel, opt.savingsCo2,
        opt.aiRecommendation,
      ]);
      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.saveOptimization]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Get optimization for a route ─────────────────────────
  async getOptimization(routeId) {
    try {
      const result = await pool.query(`
        SELECT * FROM route_optimizations WHERE route_id = $1 LIMIT 1
      `, [routeId]);
      return { success: true, data: result.rows[0] || null };
    } catch (err) {
      console.error('[DeliveryModel.getOptimization]', err.message);
      return { success: true, data: null };
    }
  },

  // ── Update route status ──────────────────────────────────
  async updateStatus(routeId, businessId, newStatus, extra = {}) {
    try {
      const completedAt = extra.completedAt || null;

      const result = await pool.query(`
        UPDATE delivery_routes
        SET
          status       = $1,
          completed_at = CASE WHEN $2::text IS NOT NULL
                         THEN $2::timestamp
                         ELSE completed_at END,
          updated_at   = NOW()
        WHERE route_id = $3 AND business_id = $4
        RETURNING *
      `, [newStatus, completedAt, routeId, businessId]);

      if (result.rows.length === 0)
        return { success: false, error: 'Route not found' };

      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.updateStatus]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Delete a route ───────────────────────────────────────
  async deleteRoute(routeId, businessId) {
    try {
      const check = await pool.query(
        `SELECT status FROM delivery_routes WHERE route_id=$1 AND business_id=$2`,
        [routeId, businessId]
      );

      if (check.rows.length === 0)
        return { success: false, error: 'Route not found' };

      const deletable = ['planned', 'optimized', 'declined'];
      if (!deletable.includes(check.rows[0].status))
        return { success: false, error: `Cannot delete a route with status "${check.rows[0].status}"` };

      await pool.query(
        `DELETE FROM delivery_routes WHERE route_id=$1 AND business_id=$2`,
        [routeId, businessId]
      );

      return { success: true };
    } catch (err) {
      console.error('[DeliveryModel.deleteRoute]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Create delivery log ──────────────────────────────────
  async createDeliveryLog(data) {
    try {
      const {
        routeId, businessId, driverUserId,
        actualDistanceKm, actualDurationMinutes,
        actualFuelUsedLiters, actualCarbonKg,
        driverName, notes,
      } = data;

      const result = await pool.query(`
        INSERT INTO delivery_logs (
          route_id, business_id, driver_user_id,
          actual_distance_km, actual_duration_minutes,
          actual_fuel_used_liters, actual_carbon_kg,
          delivery_date, driver_name, notes, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9,NOW())
        RETURNING *
      `, [
        routeId, businessId, driverUserId || null,
        actualDistanceKm      || 0,
        actualDurationMinutes || 0,
        actualFuelUsedLiters  || 0,
        actualCarbonKg        || 0,
        driverName || '',
        notes      || '',
      ]);

      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[DeliveryModel.createDeliveryLog]', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── Get drivers for a business ───────────────────────────
  async getDriversByBusiness(businessId) {
    try {
      const result = await pool.query(`
        SELECT
          u.user_id,
          u.full_name,
          u.email,
          dr.route_id,
          dr.route_name,
          dr.status     AS route_status,
          dr.vehicle_type,
          COALESCE(
            (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = dr.route_id),
            0
          ) AS stops_total,
          COALESCE(
            (SELECT COUNT(*) FROM route_stops rs
             WHERE rs.route_id = dr.route_id
               AND rs.actual_departure_time IS NOT NULL),
            0
          ) AS stops_completed
        FROM users u
        LEFT JOIN delivery_routes dr
          ON  dr.driver_user_id = u.user_id
          AND dr.status IN ('approved','in_transit','assigned_to_driver')
        WHERE u.business_id = $1
          AND u.role        = 'driver'
          AND u.is_active   = TRUE
        ORDER BY u.full_name
      `, [businessId]);
      return { success: true, data: result.rows };
    } catch (err) {
      console.error('[DeliveryModel.getDriversByBusiness]', err.message);
      return { success: false, error: err.message };
    }
  },

};

module.exports = DeliveryModel;