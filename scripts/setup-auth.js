/**
 * Setup script to create initial admin user and users table
 * 
 * Run with: node scripts/setup-auth.js
 * 
 * Environment variables required:
 * - DATABASE_URL
 * - ADMIN_EMAIL (optional, defaults to admin@restaurant.local)
 * - ADMIN_PASSWORD (optional, defaults to admin123)
 * - ADMIN_NAME (optional, defaults to Administrator)
 * - RESTAURANT_ID (required - the restaurant to assign admin to)
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal')
    ? false
    : { rejectUnauthorized: false },
});

async function setupAuth() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up authentication...\n');

    // 1. Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'staff', 'delivery'))
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    console.log('✅ Users table created\n');

    // 2. Check for existing restaurants
    const restaurants = await client.query('SELECT id, name FROM restaurants LIMIT 10');
    
    if (restaurants.rows.length === 0) {
      console.log('⚠️  No restaurants found. Creating default restaurant...');
      await client.query(`
        INSERT INTO restaurants (id, name, logo)
        VALUES ('default', 'Default Restaurant', '🍽️')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default restaurant created\n');
    } else {
      console.log('Available restaurants:');
      restaurants.rows.forEach(r => console.log(`  - ${r.id}: ${r.name}`));
      console.log('');
    }

    // 3. Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurant.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';
    const restaurantId = process.env.RESTAURANT_ID || restaurants.rows[0]?.id || 'default';

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log(`⚠️  Admin user already exists: ${adminEmail}`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, restaurant_id)
         VALUES ($1, $2, $3, 'admin', $4)`,
        [adminEmail, passwordHash, adminName, restaurantId]
      );
      
      console.log('✅ Admin user created:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Restaurant: ${restaurantId}`);
    }

    console.log('\n🎉 Authentication setup complete!');
    console.log('\nNext steps:');
    console.log('1. Add AUTH_SECRET to your .env.local file');
    console.log('2. Restart the dev server');
    console.log('3. Go to /login to sign in');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupAuth().catch(console.error);
