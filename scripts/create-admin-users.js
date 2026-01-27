/**
 * Create admin users for both restaurants
 * Usage: node scripts/create-admin-users.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const admins = [
  {
    email: 'admin@245580.local',
    password: 'admin123',
    name: 'Admin 245580',
    role: 'admin',
    restaurantId: '245580'
  },
  {
    email: 'admin@075660.local', 
    password: 'admin123',
    name: 'Admin 075660',
    role: 'admin',
    restaurantId: '075660'
  }
];

async function createAdmins() {
  console.log('Creating admin users...\n');
  
  for (const admin of admins) {
    try {
      const hash = await bcrypt.hash(admin.password, 12);
      
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, restaurant_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET 
           password_hash = $2,
           name = $3,
           role = $4,
           restaurant_id = $5,
           is_active = true`,
        [admin.email, hash, admin.name, admin.role, admin.restaurantId]
      );
      
      console.log(`✅ ${admin.email} / ${admin.password} → restaurant ${admin.restaurantId}`);
    } catch (error) {
      console.error(`❌ Failed to create ${admin.email}:`, error.message);
    }
  }
  
  console.log('\n📋 All admin users:');
  const result = await pool.query(
    `SELECT email, name, role, restaurant_id, is_active 
     FROM users 
     WHERE role = 'admin' 
     ORDER BY restaurant_id`
  );
  console.table(result.rows);
  
  await pool.end();
}

createAdmins().catch(console.error);
