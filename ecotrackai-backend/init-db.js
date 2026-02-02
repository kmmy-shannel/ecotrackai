const Alert = require('./models/alert.model');

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check if products table exists first (for foreign key)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          quantity INT DEFAULT 0,
          expiry_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Products table checked/created');
    } catch (error) {
      console.log('⚠️  Products table already exists or error:', error.message);
    }
    
    await Alert.createAlertsTable();
    
    // Insert sample alerts if table is empty
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM alerts');
    if (parseInt(rows[0].count) === 0) {
      console.log('📊 Inserting sample alerts...');
      
      const sampleAlerts = [
        {
          product_id: 1,
          product_name: 'Organic Tomatoes',
          alert_type: 'spoilage',
          risk_level: 'HIGH',
          details: 'Visible mold growth detected',
          days_left: 1,
          temperature: 25.5,
          humidity: 85.0,
          location: 'Warehouse A'
        },
        {
          product_id: 2,
          product_name: 'Fresh Milk',
          alert_type: 'temperature',
          risk_level: 'MEDIUM',
          details: 'Temperature above safe limit',
          days_left: 3,
          temperature: 8.5,
          humidity: 70.0,
          location: 'Cold Room 3'
        },
        {
          product_id: 3,
          product_name: 'Bananas',
          alert_type: 'expiry',
          risk_level: 'LOW',
          details: 'Approaching expiry date',
          days_left: 5,
          temperature: 18.0,
          humidity: 65.0,
          location: 'Room B'
        }
      ];

      for (const alert of sampleAlerts) {
        await Alert.create(alert);
      }
      console.log('✅ Sample alerts inserted');
    }
    
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Full error:', error.stack);
    process.exit(1);
  }
}

// Import pool after defining
const pool = require('./config/database');

initDatabase();