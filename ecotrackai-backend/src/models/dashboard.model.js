const pool = require('../config/database');

const DashboardModel = {

  // No DB queries needed for this controller —
  // getDashboardInsights only receives stats from the frontend (req.body)
  // and passes them to the AI service. No direct DB access required.
  //
  // This file is kept as the proper MVVM placeholder.
  // If future dashboard endpoints need DB queries, add them here.

};

module.exports = DashboardModel;
