/**
 * Run the comprehensive cleanup migration
 * 
 * This script:
 * 1. Deletes test restaurants ('asdasd', 'default')
 * 2. Fixes nullable restaurant_id on product_categories
 * 3. Drops unused products table
 * 4. Enables Row Level Security
 * 5. Adds missing updated_at columns
 * 
 * Usage: node scripts/run-cleanup-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting comprehensive database cleanup...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'cleanup-migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    const result = await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Show results
    console.log('📊 Final state:\n');
    
    // Show remaining restaurants
    const restaurants = await client.query('SELECT id, name FROM restaurants ORDER BY id');
    console.log('Restaurants:');
    restaurants.rows.forEach(r => console.log(`  - ${r.id}: ${r.name}`));
    
    // Show RLS status
    const rls = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('suppliers', 'product_categories', 'sections', 'orders', 'custom_products')
    `);
    console.log('\nRLS Status:');
    rls.rows.forEach(r => console.log(`  - ${r.tablename}: ${r.rowsecurity ? '✅ enabled' : '❌ disabled'}`));
    
    // Verify products table is gone
    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products'
    `);
    console.log(`\nProducts table: ${tables.rows.length === 0 ? '✅ dropped' : '❌ still exists'}`);
    
    console.log('\n⚠️  IMPORTANT: Update your API code to use withTenant() helper!');
    console.log('   See lib/db.ts for implementation details.\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
