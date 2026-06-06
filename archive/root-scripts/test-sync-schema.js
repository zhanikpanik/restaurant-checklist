/**
 * Test script to verify Poster sync schema
 * Run: node test-sync-schema.js
 */

import pool from './lib/db.js';

async function testSchema() {
  console.log('🔍 Checking Poster sync tables...\n');

  const tables = [
    'poster_sync_status',
    'poster_categories',
    'poster_products',
    'poster_suppliers',
    'poster_ingredients',
    'poster_storages'
  ];

  try {
    for (const table of tables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = $1
      `, [table]);

      const exists = result.rows[0].count > 0;
      
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table.padEnd(25)} - ${countResult.rows[0].count} records`);
      } else {
        console.log(`❌ ${table.padEnd(25)} - NOT FOUND`);
      }
    }

    console.log('\n✅ Schema check complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testSchema();
