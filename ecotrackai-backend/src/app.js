const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const managerRoutes = require('./routes/manager.routes');
const productRoutes = require('./routes/product.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const catalogRoutes = require('./routes/catalog.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const managerApprovalsRoutes = require('./routes/managerApprovals.routes');
const alertRoutes = require('./routes/alert.routes');
const ecotrustRoutes = require('./routes/ecotrust.routes');
const AlertService = require('./services/alert.service');
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes); 
app.use('/api/products',productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/super-admin', superadminRoutes);
app.use('/api/manager', managerApprovalsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ecotrust', ecotrustRoutes);

// Manager base check (helps verify correct backend instance is running)
app.get('/api/manager', (req, res) => {
  res.json({ success: true, message: 'Manager routes active' });
});

let lastSpoilageCronRunDate = null;
const SPOILAGE_CRON_ENABLED = process.env.SPOILAGE_CRON_ENABLED !== 'false';
const SPOILAGE_CRON_HOUR = Number(process.env.SPOILAGE_CRON_HOUR || 2);
const SPOILAGE_CRON_MINUTE = Number(process.env.SPOILAGE_CRON_MINUTE || 0);
const SPOILAGE_CRON_RUN_ON_START = process.env.SPOILAGE_CRON_RUN_ON_START === 'true';

const runSpoilageRiskEngine = async (trigger) => {
  try {
    const result = await AlertService.runDailySpoilageRiskEngine();
    if (!result?.success) {
      console.error('[SpoilageRiskCron.run]', trigger, result?.error || 'Unknown error');
      return;
    }

    console.log('[SpoilageRiskCron.run]', trigger, {
      alerts_created: result.data.alertsCreated,
      alerts_updated: result.data.alertsUpdated,
      businesses_processed: result.data.businessesProcessed,
      high_risk_batches: result.data.highRiskBatches
    });
  } catch (error) {
    console.error('[SpoilageRiskCron.run]', trigger, error);
  }
};

const startSpoilageRiskCron = () => {
  if (!SPOILAGE_CRON_ENABLED || process.env.NODE_ENV === 'test') {
    return;
  }

  if (global.__ecotrackaiSpoilageCronStarted) {
    return;
  }
  global.__ecotrackaiSpoilageCronStarted = true;

  const tick = async () => {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    if (now.getHours() !== SPOILAGE_CRON_HOUR || now.getMinutes() !== SPOILAGE_CRON_MINUTE) {
      return;
    }
    if (lastSpoilageCronRunDate === dayKey) {
      return;
    }

    lastSpoilageCronRunDate = dayKey;
    await runSpoilageRiskEngine('scheduled_daily');
  };

  setInterval(() => {
    tick().catch((error) => console.error('[SpoilageRiskCron.tick]', error));
  }, 60000);

  console.log('[SpoilageRiskCron] initialized', {
    hour: SPOILAGE_CRON_HOUR,
    minute: SPOILAGE_CRON_MINUTE,
    enabled: SPOILAGE_CRON_ENABLED
  });

  if (SPOILAGE_CRON_RUN_ON_START) {
    runSpoilageRiskEngine('startup').catch((error) => console.error('[SpoilageRiskCron.startup]', error));
  }
};

startSpoilageRiskCron();

console.log('\nRegistered API Routes:');
console.log('/api/auth');
console.log('/api/managers');
console.log('/api/products')
console.log('/api/catalog')
console.log('/api/health\n');
console.log('/api/ecotrust');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EcoTrackAI API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
