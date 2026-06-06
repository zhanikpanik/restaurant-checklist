const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkRecentLogs() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("railway.internal")
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log('🔍 Checking latest 5 webhook logs...');
    
    const res = await client.query(`
      SELECT restaurant_id, created_at, payload 
      FROM webhook_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (res.rows.length === 0) {
      console.log('⚠️  No webhooks found.');
    } else {
      res.rows.forEach(row => {
        console.log(`\n[${row.created_at}] Restaurant: ${row.restaurant_id}`);
        const p = row.payload;
        console.log(`Action: ${p.action}, Object: ${p.object}, Account: ${p.account}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

checkRecentLogs();