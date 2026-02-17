// ============================================================
// FILE LOCATION: backend/src/models/carbon.model.js
// LAYER: Model — DB queries ONLY, no business logic
// ============================================================

const pool = require('../config/database');

const CarbonModel = {

  // Get all delivery routes for a business within a date range
  async findDeliveriesByDateRange(businessId, startDate, endDate) {
    const query = `
      SELECT 
        route_id,
        vehicle_type,
        COALESCE(total_distance_km, 0) as total_distance,
        COALESCE(estimated_fuel_consumption_liters, 0) as fuel_consumption,
        COALESCE(estimated_carbon_kg, 0) as carbon_emissions,
        created_at,
        status
      FROM delivery_routes
      WHERE business_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const { rows } = await pool.query(query, [businessId, startDate, endDate]);
    return rows;
  },

  // Get aggregated totals for a business within a date range
  async getMonthTotals(businessId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as trip_count,
        COALESCE(SUM(total_distance_km), 0) as total_distance,
        COALESCE(SUM(estimated_fuel_consumption_liters), 0) as total_fuel,
        COALESCE(SUM(estimated_carbon_kg), 0) as total_emissions
      FROM delivery_routes
      WHERE business_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const { rows } = await pool.query(query, [businessId, startDate, endDate]);
    return rows[0];
  }

};

module.exports = CarbonModel;