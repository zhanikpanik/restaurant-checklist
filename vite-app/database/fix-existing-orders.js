import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function fixExistingOrders() {
  console.log('🔧 Fixing existing orders - adding supplier_id to items...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // Get all orders
    const ordersResult = await client.query(`
      SELECT id, order_data, restaurant_id
      FROM orders
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${ordersResult.rows.length} orders to check\n`);
    
    let updatedCount = 0;
    
    for (const order of ordersResult.rows) {
      const items = order.order_data.items || [];
      let needsUpdate = false;
      
      const updatedItems = [];
      
      for (const item of items) {
        // Skip if already has supplier_id
        if (item.supplier_id) {
          updatedItems.push(item);
          continue;
        }
        
        // Try to find supplier_id from the product
        if (item.productId) {
          const productResult = await client.query(`
            SELECT sp.supplier_id, s.name as supplier_name
            FROM section_products sp
            LEFT JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.id = $1
          `, [item.productId]);
          
          if (productResult.rows.length > 0 && productResult.rows[0].supplier_id) {
            item.supplier_id = productResult.rows[0].supplier_id;
            item.supplier = productResult.rows[0].supplier_name;
            needsUpdate = true;
            console.log(`  ✓ Added supplier_id ${item.supplier_id} to item: ${item.name}`);
          }
        }
        
        updatedItems.push(item);
      }
      
      if (needsUpdate) {
        // Update the order
        await client.query(`
          UPDATE orders
          SET order_data = $1
          WHERE id = $2
        `, [JSON.stringify({ ...order.order_data, items: updatedItems }), order.id]);
        
        updatedCount++;
        console.log(`✓ Updated order #${order.id}\n`);
      }
    }
    
    console.log(`\n✅ Done! Updated ${updatedCount} orders`);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixExistingOrders();
