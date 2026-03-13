const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes             = require('./routes/auth.routes');
const managerRoutes          = require('./routes/manager.routes');
const productRoutes          = require('./routes/product.routes');
const aiRoutes               = require('./routes/ai.routes');
const deliveryRoutes         = require('./routes/delivery.routes');
const alertRoutes            = require('./routes/alert.routes');
const indexRoutes            = require('./routes/index');
const carbonRoutes           = require('./routes/carbon.routes');
const approvalRoutes         = require('./routes/approval.routes');
const managerApprovalsRoutes = require('./routes/managerApprovals.routes');
const inventoryRoutes        = require('./routes/inventory.routes');
const logisticsRoutes        = require('./routes/logistics.routes');
const routeApprovalRoutes    = require('./routes/route.approval.routes');

const superadminRoutes       = require('./routes/superadmin.routes');
const catalogRoutes          = require('./routes/catalog.routes');
const ecotrustRoutes         = require('./routes/ecotrust.routes');


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

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/managers',   managerRoutes);
app.use('/api/manager',    managerApprovalsRoutes);
app.use('/api/inventory',  inventoryRoutes);   

app.use('/api/products',   productRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/carbon',     carbonRoutes);
app.use('/api/approvals',  approvalRoutes);

app.use('/api/logistics',      logisticsRoutes);
app.use('/api/route-approvals', routeApprovalRoutes);

app.use('/api/superadmin',     superadminRoutes);
app.use('/api/catalog',        catalogRoutes);


app.use('/api/ecotrust',   ecotrustRoutes);

app.use('/api',            indexRoutes);   // ← MUST be last, it matches all /api/*

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EcoTrackAI API is running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});