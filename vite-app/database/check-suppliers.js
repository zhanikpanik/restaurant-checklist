import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkSuppliers() {
  console.log('🔍 Checking suppliers...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // Get all suppliers
    const result = await client.query(`
      SELECT id, name, poster_supplier_id, restaurant_id
      FROM suppliers
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} supplier(s):\n`);
    
    result.rows.forEach(supplier => {
      console.log(`ID: ${supplier.id}`);
      console.log(`Name: ${supplier.name}`);
      console.log(`Poster Supplier ID: ${supplier.poster_supplier_id || '❌ NOT SET'}`);
      console.log(`Restaurant ID: ${supplier.restaurant_id}`);
      console.log('---');
    });

    console.log('\n💡 To link a supplier to Poster:');
    console.log('   1. Find the Poster supplier ID from your Poster account');
    console.log('   2. Run this SQL:');
    console.log('      UPDATE suppliers SET poster_supplier_id = YOUR_POSTER_ID WHERE id = YOUR_LOCAL_ID;\n');
    console.log('   Or use the update script: node database/update-supplier-poster-id.js\n');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSuppliers();
