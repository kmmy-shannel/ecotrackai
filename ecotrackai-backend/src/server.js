const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const managerRoutes = require('./routes/manager.routes');
const productRoutes = require('./routes/product.routes'); // ← ADD THIS LINE

const app = express();

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/products', productRoutes); // ← ADD THIS LINE

console.log('\nRegistered API Routes:');
console.log('   /api/auth');
console.log('   /api/managers');
console.log('   /api/products');      // ← ADD THIS LINE
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