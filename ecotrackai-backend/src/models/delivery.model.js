// ============================================================
// FILE LOCATION: backend/src/models/delivery.model.js
// LAYER: Model — DB queries ONLY, no business logic
// ============================================================

const pool = require('../config/database');

const DeliveryModel = {

  // Get all deliveries for a business
  async findAllByBusiness(businessId) {
    const query = `
      SELECT
        route_id         AS id,
        delivery_code,
        delivery_date    AS date,
        driver_name      AS driver,
        vehicle_type,
        estimated_load,
        stops,
        total_distance_km              AS total_distance,
        estimated_duration_minutes     AS estimated_duration,
        estimated_fuel_consumption_liters AS fuel_consumption,
        estimated_carbon_kg            AS carbon_emissions,
        route_geometry,
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
        route_id         AS id,
        delivery_code,
        delivery_date    AS date,
        driver_name      AS driver,
        vehicle_type,
        estimated_load,
        stops,
        total_distance_km              AS total_distance,
        estimated_duration_minutes     AS estimated_duration,
        estimated_fuel_consumption_liters AS fuel_consumption,
        estimated_carbon_kg            AS carbon_emissions,
        route_geometry,
        status,
        created_at
      FROM delivery_routes
      WHERE route_id = $1
    `;
    const { rows } = await pool.query(query, [routeId]);
    return rows[0] || null;
  },

  // Count total deliveries for a business (used for delivery code generation)
  async countByBusiness(businessId) {
    const query = `SELECT COUNT(*) as count FROM delivery_routes WHERE business_id = $1`;
    const { rows } = await pool.query(query, [businessId]);
    return parseInt(rows[0].count);
  },

  // Insert new delivery
  async create(businessId, deliveryData) {
    const query = `
      INSERT INTO delivery_routes (
        business_id,
        delivery_code,
        delivery_date,
        driver_name,
        vehicle_type,
        estimated_load,
        stops,
        total_distance_km,
        estimated_duration_minutes,
        estimated_fuel_consumption_liters,
        estimated_carbon_kg,
        route_geometry,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        route_id AS id,
        delivery_code,
        delivery_date    AS date,
        driver_name      AS driver,
        vehicle_type,
        stops,
        total_distance_km              AS total_distance,
        estimated_duration_minutes     AS estimated_duration,
        estimated_fuel_consumption_liters AS fuel_consumption,
        estimated_carbon_kg            AS carbon_emissions,
        status
    `;

    const { rows } = await pool.query(query, [
      businessId,
      deliveryData.deliveryCode,
      deliveryData.deliveryDate,
      deliveryData.driver,
      deliveryData.vehicleType,
      deliveryData.estimatedLoad,
      JSON.stringify(deliveryData.stops),
      deliveryData.totalDistance,
      deliveryData.estimatedDuration,
      deliveryData.fuelConsumption,
      deliveryData.carbonEmissions,
      deliveryData.routeGeometry ? JSON.stringify(deliveryData.routeGeometry) : null,
      'pending'
    ]);

    return rows[0];
  },

  // Apply optimization — update route metrics + stops
  async applyOptimization(routeId, optimizedRoute) {
    const query = `
      UPDATE delivery_routes
      SET
        stops                             = $1,
        total_distance_km                 = $2,
        estimated_duration_minutes        = $3,
        estimated_fuel_consumption_liters = $4,
        estimated_carbon_kg               = $5
      WHERE route_id = $6
      RETURNING route_id AS id, delivery_code, status
    `;

    const { rows } = await pool.query(query, [
      JSON.stringify(optimizedRoute.stops),
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