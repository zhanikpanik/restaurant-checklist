const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkRecentSyncs() {
  try {
    const res = await pool.query(`
      SELECT 
        r.id, 
        r.name, 
        r.created_at,
        (SELECT COUNT(*) FROM sections WHERE restaurant_id = r.id) as sections,
        (SELECT COUNT(*) FROM section_products sp JOIN sections s ON sp.section_id = s.id WHERE s.restaurant_id = r.id) as products
      FROM restaurants r
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkRecentSyncs();
