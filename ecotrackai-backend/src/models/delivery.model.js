// ============================================================
// FILE LOCATION: backend/src/models/delivery.model.js
// LAYER: Model — DB queries ONLY, no business logic
// UPDATED to match actual delivery_routes table schema
// ============================================================

const pool = require('../config/database');

const DeliveryModel = {

  // Get all deliveries for a business
  async findAllByBusiness(businessId) {
   const query = `
  SELECT
    route_id                          AS id,
    route_name                        AS delivery_code,
    created_at                        AS date,
    driver_name                       AS driver,
    vehicle_type,
    0                                 AS estimated_load,
    jsonb_build_array(
      origin_location,
      destination_location
    )                                 AS stops,
    total_distance_km                 AS total_distance,
    estimated_duration_minutes        AS estimated_duration,
    estimated_fuel_consumption_liters AS fuel_consumption,
    estimated_carbon_kg               AS carbon_emissions,
    NULL                              AS route_geometry,
    status,
    created_at
  FROM delivery_routes
  WHERE business_id = $1
  ORDER BY created_at DESC
`;
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  // Get single delivery by ID
  async findById(routeId) {
   const query = `
  SELECT
    route_id                          AS id,
    route_name                        AS delivery_code,
    created_at                        AS date,
    driver_name                       AS driver,
    vehicle_type,
    0                                 AS estimated_load,
    jsonb_build_array(
      origin_location,
      destination_location
    )                                 AS stops,
    total_distance_km                 AS total_distance,
    estimated_duration_minutes        AS estimated_duration,
    estimated_fuel_consumption_liters AS fuel_consumption,
    estimated_carbon_kg               AS carbon_emissions,
    NULL                              AS route_geometry,
    status,
    created_at
  FROM delivery_routes
  WHERE route_id = $1
`;
    const { rows } = await pool.query(query, [routeId]);
    return rows[0] || null;
  },

  // Count total deliveries for a business
  async countByBusiness(businessId) {
    const query = `SELECT COUNT(*) as count FROM delivery_routes WHERE business_id = $1`;
    const { rows } = await pool.query(query, [businessId]);
    return parseInt(rows[0].count);
  },

  // Insert new delivery - UPDATED to match actual schema
  async create(businessId, deliveryData) {
    const query = `
  INSERT INTO delivery_routes (
    business_id,
    route_name,
    driver_name,
    origin_location,
    destination_location,
    vehicle_type,
    total_distance_km,
    estimated_duration_minutes,
    estimated_fuel_consumption_liters,
    estimated_carbon_kg,
    status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING
    route_id AS id,
    route_name AS delivery_code,
    created_at AS date,
    driver_name AS driver,
    vehicle_type,
    total_distance_km AS total_distance,
    estimated_duration_minutes AS estimated_duration,
    estimated_fuel_consumption_liters AS fuel_consumption,
    estimated_carbon_kg AS carbon_emissions,
    status
`;

    // Extract origin and destination from stops array
    const origin = deliveryData.stops && deliveryData.stops[0] ? {
      location: deliveryData.stops[0].location,
      lat: deliveryData.stops[0].lat,
      lng: deliveryData.stops[0].lng
    } : { location: 'Unknown', lat: 0, lng: 0 };

    const destination = deliveryData.stops && deliveryData.stops[deliveryData.stops.length - 1] ? {
      location: deliveryData.stops[deliveryData.stops.length - 1].location,
      lat: deliveryData.stops[deliveryData.stops.length - 1].lat,
      lng: deliveryData.stops[deliveryData.stops.length - 1].lng
    } : { location: 'Unknown', lat: 0, lng: 0 };

   const { rows } = await pool.query(query, [
  businessId,
  deliveryData.deliveryCode || `Route-${Date.now()}`,
  deliveryData.driver || 'Driver Not Assigned',
  JSON.stringify(origin),
  JSON.stringify(destination),
  deliveryData.vehicleType || 'van',
  deliveryData.totalDistance || 0,
  deliveryData.estimatedDuration || 0,
  deliveryData.fuelConsumption || 0,
  deliveryData.carbonEmissions || 0,
  'pending'
]);

    return rows[0];
  },

  // Apply optimization — update route metrics
  async applyOptimization(routeId, optimizedRoute) {
    const query = `
      UPDATE delivery_routes
      SET
        total_distance_km                 = $1,
        estimated_duration_minutes        = $2,
        estimated_fuel_consumption_liters = $3,
        estimated_carbon_kg               = $4
      WHERE route_id = $5
      RETURNING 
        route_id AS id, 
        route_name AS delivery_code, 
        status
    `;

    const { rows } = await pool.query(query, [
      optimizedRoute.totalDistance,
      optimizedRoute.estimatedDuration,
      optimizedRoute.fuelConsumption,
      optimizedRoute.carbonEmissions,
      routeId
    ]);

    return rows[0] || null;
  },

  // Delete delivery
  async delete(routeId) {
    await pool.query('DELETE FROM delivery_routes WHERE route_id = $1', [routeId]);
  }

};

module.exports = DeliveryModel;