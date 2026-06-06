// Migration script - run with: node scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connecting to database...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/008_webhook_logs.sql'),
      'utf8'
    );

    console.log('📝 Running migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    
    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'webhook_logs'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 webhook_logs table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
