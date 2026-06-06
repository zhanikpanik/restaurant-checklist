const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  try {
    console.log('--- RESTAURANTS TABLE ---');
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'restaurants'");
    console.table(res.rows);

    console.log('\n--- POSTER_TOKENS TABLE ---');
    const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'poster_tokens'");
    console.table(res2.rows);

    const constraints = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'poster_tokens'::regclass
    `);
    console.log('\n--- CONSTRAINTS ON POSTER_TOKENS ---');
    console.table(constraints.rows);

  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
