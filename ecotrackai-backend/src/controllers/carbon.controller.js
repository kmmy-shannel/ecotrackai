const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response.utils');

const CO2_PER_LITER = 2.31;

const getCarbonFootprint = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('Calculating carbon for business:', businessId);
    console.log('Date range:', firstDayOfMonth, 'to', lastDayOfMonth);

    // ✅ Use EXACT column names from your delivery_routes table
    const deliveriesQuery = `
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

    const { rows: deliveries } = await pool.query(deliveriesQuery, [
      businessId,
      firstDayOfMonth,
      lastDayOfMonth
    ]);

    console.log('✅ Found deliveries this month:', deliveries.length);

    // Calculate totals
    let totalTrips = deliveries.length;
    let totalDistance = 0;
    let totalFuel = 0;
    let totalEmissions = 0;

    deliveries.forEach(delivery => {
      totalDistance += parseFloat(delivery.total_distance) || 0;
      totalFuel += parseFloat(delivery.fuel_consumption) || 0;
      totalEmissions += parseFloat(delivery.carbon_emissions) || 0;
    });

    // Estimate if no values stored yet
    if (totalFuel === 0 && totalDistance > 0) {
      totalFuel = (totalDistance / 100) * 10;
      totalEmissions = totalFuel * CO2_PER_LITER;
    }

    // ✅ Get previous month for comparison
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const prevMonthQuery = `
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

    const { rows: prevMonth } = await pool.query(prevMonthQuery, [
      businessId,
      firstDayOfPrevMonth,
      lastDayOfPrevMonth
    ]);

    const prevEmissions = parseFloat(prevMonth[0]?.total_emissions) || 0;
    const emissionsChange = prevEmissions > 0
      ? ((totalEmissions - prevEmissions) / prevEmissions * 100).toFixed(1)
      : 0;

    const result = {
      thisMonth: {
        totalEmissions: parseFloat(totalEmissions.toFixed(2)),
        deliveryTrips: totalTrips,
        distanceTraveled: parseFloat(totalDistance.toFixed(1)),
        litersOfFuelUsed: parseFloat(totalFuel.toFixed(1)),
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      comparison: {
        previousMonth: parseFloat(prevEmissions.toFixed(2)),
        change: parseFloat(emissionsChange),
        trend: parseFloat(emissionsChange) < 0 ? 'decreased' :
               parseFloat(emissionsChange) > 0 ? 'increased' : 'same'
      }
    };

    console.log('📈 Result:', result);
    sendSuccess(res, 200, 'Carbon footprint calculated successfully', result);

  } catch (error) {
    console.error('❌ Carbon footprint error:', error);
    sendError(res, 500, 'Failed to calculate carbon footprint', error.message);
  }
};

const getMonthlyComparison = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const monthsData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      try {
        // ✅ Use exact column names
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

        const { rows } = await pool.query(query, [businessId, firstDay, lastDay]);

        monthsData.push({
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          trips: parseInt(rows[0].trip_count) || 0,
          distance: parseFloat(rows[0].total_distance || 0).toFixed(1),
          fuel: parseFloat(rows[0].total_fuel || 0).toFixed(1),
          emissions: parseFloat(rows[0].total_emissions || 0).toFixed(2)
        });
      } catch (monthError) {
        console.log(`⚠️ Error for month ${i}:`, monthError.message);
        monthsData.push({
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          trips: 0,
          distance: '0.0',
          fuel: '0.0',
          emissions: '0.00'
        });
      }
    }

    sendSuccess(res, 200, 'Monthly comparison retrieved', { months: monthsData });

  } catch (error) {
    console.error('Monthly comparison error:', error);
    sendError(res, 500, 'Failed to get monthly comparison', error.message);
  }
};

module.exports = { getCarbonFootprint, getMonthlyComparison };