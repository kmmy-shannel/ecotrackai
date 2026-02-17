const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const managerRoutes = require('./routes/manager.routes');
const productRoutes = require('./routes/product.routes');
const aiRoutes = require('./routes/ai.routes') 
const deliveryRoutes = require('./routes/delivery.routes');
const alertRoutes = require('./routes/alert.routes');
const indexRoutes = require('./routes/index');
const carbonRoutes = require('./routes/carbon.routes');
const app = express();

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Allows Render + any frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api', indexRoutes);  
app.use('/api/carbon', carbonRoutes);

console.log('\nRegistered API Routes:');
console.log('   /api/auth');
console.log('   /api/managers');
console.log('   /api/products');    
console.log('   /api/alerts'); 
console.log('   /api/health\n');

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EcoTrackAI API is running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});