// ============================================================
// FILE LOCATION: backend/src/services/carbon.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

const CarbonModel = require('../models/carbon.model');

const CO2_PER_LITER = 2.31;

const CarbonService = {

  // Calculate carbon footprint for current month + comparison vs last month
  async getCarbonFootprint(businessId) {
    const now = new Date();

    // Current month date range
    const firstDayOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Previous month date range
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth  = new Date(now.getFullYear(), now.getMonth(), 0);

    console.log('Calculating carbon for business:', businessId);
    console.log('Date range:', firstDayOfMonth, 'to', lastDayOfMonth);

    // Fetch current month deliveries (raw rows for per-delivery processing)
    const deliveries = await CarbonModel.findDeliveriesByDateRange(
      businessId,
      firstDayOfMonth,
      lastDayOfMonth
    );

    console.log('Found deliveries this month:', deliveries.length);

    // Aggregate current month totals
    let totalTrips     = deliveries.length;
    let totalDistance  = 0;
    let totalFuel      = 0;
    let totalEmissions = 0;

    deliveries.forEach(delivery => {
      totalDistance  += parseFloat(delivery.total_distance)   || 0;
      totalFuel      += parseFloat(delivery.fuel_consumption) || 0;
      totalEmissions += parseFloat(delivery.carbon_emissions) || 0;
    });

    // Estimate fuel/emissions if not stored yet but distance exists
    if (totalFuel === 0 && totalDistance > 0) {
      totalFuel      = (totalDistance / 100) * 10;
      totalEmissions = totalFuel * CO2_PER_LITER;
    }

    // Fetch previous month aggregated totals
    const prevMonth    = await CarbonModel.getMonthTotals(
      businessId,
      firstDayOfPrevMonth,
      lastDayOfPrevMonth
    );

    const prevEmissions    = parseFloat(prevMonth?.total_emissions) || 0;
    const emissionsChange  = prevEmissions > 0
      ? ((totalEmissions - prevEmissions) / prevEmissions * 100).toFixed(1)
      : 0;

    const result = {
      thisMonth: {
        totalEmissions:    parseFloat(totalEmissions.toFixed(2)),
        deliveryTrips:     totalTrips,
        distanceTraveled:  parseFloat(totalDistance.toFixed(1)),
        litersOfFuelUsed:  parseFloat(totalFuel.toFixed(1)),
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      comparison: {
        previousMonth: parseFloat(prevEmissions.toFixed(2)),
        change:        parseFloat(emissionsChange),
        trend: parseFloat(emissionsChange) < 0 ? 'decreased'
             : parseFloat(emissionsChange) > 0 ? 'increased'
             : 'same'
      }
    };

    console.log('Result:', result);
    return result;
  },

  // Get last 6 months of carbon data for chart/comparison
  async getMonthlyComparison(businessId) {
    const monthsData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay  = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      try {
        const row = await CarbonModel.getMonthTotals(businessId, firstDay, lastDay);

        monthsData.push({
          month:     date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          trips:     parseInt(row.trip_count)      || 0,
          distance:  parseFloat(row.total_distance || 0).toFixed(1),
          fuel:      parseFloat(row.total_fuel     || 0).toFixed(1),
          emissions: parseFloat(row.total_emissions || 0).toFixed(2)
        });

      } catch (monthError) {
        console.log(`Warning: Error for month offset ${i}:`, monthError.message);
        monthsData.push({
          month:     date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          trips:     0,
          distance:  '0.0',
          fuel:      '0.0',
          emissions: '0.00'
        });
      }
    }

    return { months: monthsData };
  }

};

module.exports = CarbonService;