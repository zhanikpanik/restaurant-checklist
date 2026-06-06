const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:mDnveVoNDWBsLgykdqCrKmBJAfJGKoMf@shortline.proxy.rlwy.net:37099/railway";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function checkTable() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Checking for user_sections table...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_sections'
    `);
    
    if (res.rows.length > 0) {
      console.log('✅ Table user_sections exists.');
      
      console.log('Checking columns...');
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_sections'
      `);
      console.table(cols.rows);

      // Check for RLS
      console.log('Checking RLS policies...');
      const rls = await client.query(`
        SELECT * FROM pg_policies WHERE tablename = 'user_sections'
      `);
      console.table(rls.rows);
      
    } else {
      console.log('❌ Table user_sections does NOT exist.');
    }
    
    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkTable();
