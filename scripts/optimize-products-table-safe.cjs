require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting products table optimization...\n');
    
    // Check which columns exist in products table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    
    const columns = columnsResult.rows.map(r => r.column_name);
    console.log('📋 Detected columns:', columns.join(', '));
    console.log('');
    
    // 1. Index on category_id (if exists)
    if (columns.includes('category_id')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_category_id 
        ON products(category_id);
      `);
      console.log('✅ Added index on category_id');
    }
    
    // 2. Index on supplier_id (if exists)
    if (columns.includes('supplier_id')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_supplier_id 
        ON products(supplier_id);
      `);
      console.log('✅ Added index on supplier_id');
    } else {
      console.log('⚠️  Skipped supplier_id (column does not exist)');
    }
    
    // 3. Index on name (if exists)
    if (columns.includes('name')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_name 
        ON products(name);
      `);
      console.log('✅ Added index on name');
    }
    
    // 4. Composite index for filtering by restaurant + category (if both exist)
    if (columns.includes('restaurant_id') && columns.includes('category_id')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_restaurant_category 
        ON products(restaurant_id, category_id);
      `);
      console.log('✅ Added composite index on restaurant_id + category_id');
    }
    
    // 5. Partial index on poster_id (if exists)
    if (columns.includes('poster_id')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_poster_id 
        ON products(poster_id) 
        WHERE poster_id IS NOT NULL;
      `);
      console.log('✅ Added partial index on poster_id');
    }
    
    // 6. Index on department (if exists)
    if (columns.includes('department')) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_department 
        ON products(department);
      `);
      console.log('✅ Added index on department');
    }
    
    // 7. Analyze table to update statistics
    await client.query('ANALYZE products;');
    console.log('✅ Updated table statistics');
    
    console.log('\n🎉 Products table optimization complete!');
    
    // Show all indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'products'
      ORDER BY indexname
    `);
    
    console.log('\n📋 All Products Table Indexes:');
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    // Show table size
    const sizeResult = await client.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('products')) as total_size,
        pg_size_pretty(pg_relation_size('products')) as table_size,
        pg_size_pretty(pg_total_relation_size('products') - pg_relation_size('products')) as indexes_size
    `);
    
    console.log('\n💾 Table Size:');
    console.log(`  Total: ${sizeResult.rows[0].total_size}`);
    console.log(`  Table: ${sizeResult.rows[0].table_size}`);
    console.log(`  Indexes: ${sizeResult.rows[0].indexes_size}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();

