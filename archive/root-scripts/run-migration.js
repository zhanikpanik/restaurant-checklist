/**
 * Simple migration runner for Railway Postgres
 * Run with: node run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Get DATABASE_URL from environment or paste it here temporarily
  const databaseUrl = process.env.DATABASE_URL || 'PASTE_YOUR_DATABASE_URL_HERE';
  
  if (databaseUrl === 'PASTE_YOUR_DATABASE_URL_HERE') {
    console.error('❌ Please set DATABASE_URL environment variable or edit this file');
    console.error('   Get it from Railway Dashboard > Postgres > Variables > DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    // Read migration file
    const sqlPath = path.join(__dirname, 'migrations', '008_webhook_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // Verify table was created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'webhook_logs'
    `);

    if (result.rows.length > 0) {
      console.log('✅ webhook_logs table verified!');
    } else {
      console.log('⚠️  Table not found - please check manually');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

runMigration();
