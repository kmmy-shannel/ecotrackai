require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes       = require('./routes/auth.routes');
const managerRoutes    = require('./routes/manager.routes');
const productRoutes    = require('./routes/product.routes');
const aiRoutes         = require('./routes/ai.routes');
const deliveryRoutes   = require('./routes/delivery.routes');
const alertRoutes      = require('./routes/alert.routes');
const indexRoutes      = require('./routes/index');
const carbonRoutes     = require('./routes/carbon.routes');
const approvalRoutes   = require('./routes/approval.routes');
const catalogRoutes    = require('./routes/catalog.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const inventoryRoutes  = require('./routes/inventory.routes');


// Optional routes — wrapped so missing files don't crash the server
const safeRequire = (path) => {
  try { return require(path); }
  catch (e) { console.warn(`[server] Optional route not found, skipping: ${path}`); return null; }
};

const ecotrustRoutes         = safeRequire('./routes/ecotrust.routes');
const managerApprovalRoutes  = safeRequire('./routes/managerApprovals.routes');
const routeApprovalRoutes    = safeRequire('./routes/route.approval.routes');
const logisticsRoutes        = safeRequire('./routes/logistics.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Core Routes ───────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/managers',    managerRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/deliveries',  deliveryRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api',             indexRoutes);
app.use('/api/carbon',      carbonRoutes);
app.use('/api/approvals',   approvalRoutes);
app.use('/api/catalog',     catalogRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/super-admin', superadminRoutes);
app.use('/api/inventory',   inventoryRoutes);
if (ecotrustRoutes)         app.use('/api/ecotrust',         ecotrustRoutes);

// ── Optional Routes ───────────────────────────────────────────
if (managerApprovalRoutes)  app.use('/api/manager',          managerApprovalRoutes);
if (routeApprovalRoutes)    app.use('/api/route-approvals',  routeApprovalRoutes);
if (logisticsRoutes)        app.use('/api/logistics',        logisticsRoutes);

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EcoTrackAI API is running' });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log('Registered routes: /api/auth, /api/managers, /api/products, /api/ai, /api/deliveries, /api/alerts, /api/carbon, /api/approvals, /api/catalog, /api/dashboard, /api/super-admin, /api/inventory, /api/ecotrust\n');
});