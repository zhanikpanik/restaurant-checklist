import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function debugSuppliers() {
  console.log('🔍 Debugging Supplier Data...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // 1. Check suppliers
    console.log('📊 SUPPLIERS:');
    console.log('─'.repeat(80));
    const suppliersResult = await client.query(`
      SELECT id, name, poster_supplier_id, restaurant_id
      FROM suppliers
      ORDER BY id
    `);
    
    suppliersResult.rows.forEach(s => {
      console.log(`ID: ${s.id} | Name: ${s.name} | Poster ID: ${s.poster_supplier_id || '❌ NOT SET'}`);
    });
    console.log('');
    
    // 2. Check categories linked to suppliers
    console.log('📦 CATEGORIES (with suppliers):');
    console.log('─'.repeat(80));
    const categoriesResult = await client.query(`
      SELECT pc.id, pc.name, pc.supplier_id, s.name as supplier_name, s.poster_supplier_id
      FROM product_categories pc
      LEFT JOIN suppliers s ON pc.supplier_id = s.id
      ORDER BY pc.id
    `);
    
    categoriesResult.rows.forEach(c => {
      console.log(`Cat ID: ${c.id} | Name: ${c.name} | Supplier: ${c.supplier_name || 'None'} (ID: ${c.supplier_id || 'None'}) | Poster Supplier ID: ${c.poster_supplier_id || 'N/A'}`);
    });
    console.log('');
    
    // 3. Check section_products
    console.log('🧪 PRODUCTS (ingredients):');
    console.log('─'.repeat(80));
    const productsResult = await client.query(`
      SELECT sp.id, sp.name, sp.category_id, pc.name as category_name, 
             pc.supplier_id, s.name as supplier_name, s.poster_supplier_id,
             sp.supplier_id as direct_supplier_id
      FROM section_products sp
      LEFT JOIN product_categories pc ON sp.category_id = pc.id
      LEFT JOIN suppliers s ON pc.supplier_id = s.id
      ORDER BY sp.id
      LIMIT 10
    `);
    
    productsResult.rows.forEach(p => {
      console.log(`Product: ${p.name}`);
      console.log(`  Category: ${p.category_name || 'None'} (via category_id: ${p.category_id || 'None'})`);
      console.log(`  Supplier (via category): ${p.supplier_name || 'None'} (ID: ${p.supplier_id || 'None'})`);
      console.log(`  Direct supplier_id: ${p.direct_supplier_id || 'None'}`);
      console.log(`  Poster Supplier ID: ${p.poster_supplier_id || 'N/A'}`);
      console.log('');
    });
    
    // 4. Check recent order items
    console.log('📋 RECENT ORDER ITEMS:');
    console.log('─'.repeat(80));
    const ordersResult = await client.query(`
      SELECT id, order_data
      FROM orders
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (ordersResult.rows.length > 0) {
      const order = ordersResult.rows[0];
      console.log(`Order ID: ${order.id}`);
      const items = order.order_data.items || [];
      items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.name}`);
        console.log(`     supplier_id: ${item.supplier_id || 'NOT SET'}`);
        console.log(`     poster_id: ${item.poster_id || 'NOT SET'}`);
        console.log(`     category: ${item.category || 'NOT SET'}`);
      });
    } else {
      console.log('No orders found');
    }
    console.log('');
    
    console.log('💡 DIAGNOSIS:');
    console.log('─'.repeat(80));
    
    const suppliersWithPoster = suppliersResult.rows.filter(s => s.poster_supplier_id);
    console.log(`✓ Suppliers with Poster ID: ${suppliersWithPoster.length}/${suppliersResult.rows.length}`);
    
    const categoriesWithSuppliers = categoriesResult.rows.filter(c => c.supplier_id);
    console.log(`✓ Categories linked to suppliers: ${categoriesWithSuppliers.length}/${categoriesResult.rows.length}`);
    
    if (suppliersWithPoster.length === 0) {
      console.log('\n❌ PROBLEM: No suppliers have poster_supplier_id set!');
      console.log('   SOLUTION: Sync suppliers from Poster at /suppliers-categories');
    }
    
    console.log('');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

debugSuppliers();
