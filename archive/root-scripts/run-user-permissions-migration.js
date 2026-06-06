#!/usr/bin/env node

/**
 * Run the user permissions migration
 * Adds can_send_orders and can_receive_supplies columns to user_sections table
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  console.log('🔄 Running user permissions migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '009_add_user_permissions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');
    
    // Run migration
    const result = await pool.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Result:', result);
    
    // Verify columns exist
    console.log('\n🔍 Verifying columns...');
    const verification = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_sections' 
      AND column_name IN ('can_send_orders', 'can_receive_supplies')
      ORDER BY column_name;
    `);
    
    if (verification.rows.length === 2) {
      console.log('✅ Both columns verified:');
      verification.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}, default=${row.column_default}, nullable=${row.is_nullable}`);
      });
    } else {
      console.log('⚠️ Warning: Expected 2 columns, found', verification.rows.length);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
