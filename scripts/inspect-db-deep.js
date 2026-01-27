require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function deepInspect() {
  try {
    console.log('=== DEEP DATABASE ANALYSIS ===\n');

    // 1. Check for duplicate/redundant indexes
    console.log('📊 REDUNDANT INDEXES (indexes that might be unnecessary):\n');
    const redundantIdx = await pool.query(`
      SELECT 
        a.indexname as index1,
        b.indexname as index2,
        a.tablename
      FROM pg_indexes a
      JOIN pg_indexes b ON a.tablename = b.tablename 
        AND a.indexname < b.indexname
        AND a.schemaname = 'public'
        AND b.schemaname = 'public'
      WHERE a.indexdef LIKE '%' || SPLIT_PART(b.indexdef, '(', 2)
        OR b.indexdef LIKE '%' || SPLIT_PART(a.indexdef, '(', 2)
    `);
    if (redundantIdx.rows.length === 0) {
      console.log('   None found\n');
    } else {
      redundantIdx.rows.forEach(r => console.log(`   ${r.tablename}: ${r.index1} might overlap with ${r.index2}`));
    }

    // 2. Check for missing NOT NULL constraints on restaurant_id
    console.log('\n📊 RESTAURANT_ID NULLABILITY CHECK:\n');
    const nullableRestaurant = await pool.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE column_name = 'restaurant_id'
        AND table_schema = 'public'
      ORDER BY table_name
    `);
    for (const row of nullableRestaurant.rows) {
      const status = row.is_nullable === 'YES' ? '⚠️  NULLABLE' : '✅ NOT NULL';
      console.log(`   ${row.table_name}.${row.column_name}: ${status}`);
    }

    // 3. Check for unused restaurants
    console.log('\n📊 RESTAURANT USAGE:\n');
    const restaurantUsage = await pool.query(`
      SELECT r.id, r.name, r.is_active,
        (SELECT COUNT(*) FROM sections WHERE restaurant_id = r.id) as sections,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id) as orders,
        (SELECT COUNT(*) FROM users WHERE restaurant_id = r.id) as users
      FROM restaurants r
    `);
    for (const r of restaurantUsage.rows) {
      console.log(`   ${r.id} (${r.name}): ${r.sections} sections, ${r.orders} orders, ${r.users} users ${r.is_active ? '' : '⚠️ INACTIVE'}`);
    }

    // 4. Check for stale/old data patterns
    console.log('\n📊 DATA FRESHNESS (oldest records):\n');
    const tables = ['orders', 'sections', 'product_categories', 'suppliers'];
    for (const table of tables) {
      try {
        const oldest = await pool.query(`SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM ${table}`);
        if (oldest.rows[0].oldest) {
          console.log(`   ${table}: ${oldest.rows[0].oldest?.toISOString().split('T')[0]} to ${oldest.rows[0].newest?.toISOString().split('T')[0]}`);
        } else {
          console.log(`   ${table}: no data`);
        }
      } catch (e) {
        console.log(`   ${table}: no created_at column`);
      }
    }

    // 5. Check for orphaned section_products (no parent section)
    console.log('\n📊 ORPHANED RECORDS:\n');
    const orphanedSP = await pool.query(`
      SELECT COUNT(*) as count FROM section_products sp 
      WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.id = sp.section_id)
    `);
    console.log(`   section_products without section: ${orphanedSP.rows[0].count}`);

    const orphanedSL = await pool.query(`
      SELECT COUNT(*) as count FROM section_leftovers sl 
      WHERE NOT EXISTS (SELECT 1 FROM section_products sp WHERE sp.id = sl.section_product_id)
    `);
    console.log(`   section_leftovers without section_product: ${orphanedSL.rows[0].count}`);

    // 6. Check for duplicate data
    console.log('\n📊 POTENTIAL DUPLICATES:\n');
    const dupCategories = await pool.query(`
      SELECT restaurant_id, name, COUNT(*) as cnt 
      FROM product_categories 
      GROUP BY restaurant_id, name 
      HAVING COUNT(*) > 1
    `);
    console.log(`   Duplicate categories: ${dupCategories.rows.length}`);

    const dupSuppliers = await pool.query(`
      SELECT restaurant_id, name, COUNT(*) as cnt 
      FROM suppliers 
      GROUP BY restaurant_id, name 
      HAVING COUNT(*) > 1
    `);
    console.log(`   Duplicate suppliers: ${dupSuppliers.rows.length}`);

    // 7. Check RLS status
    console.log('\n📊 ROW LEVEL SECURITY STATUS:\n');
    const rlsStatus = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
        AND tablename IN ('suppliers', 'product_categories', 'sections', 'orders', 'products', 'custom_products', 'departments')
      ORDER BY tablename
    `);
    for (const r of rlsStatus.rows) {
      console.log(`   ${r.tablename}: RLS ${r.rowsecurity ? '✅ ENABLED' : '❌ DISABLED'}`);
    }

    // 8. Check timestamp consistency
    console.log('\n📊 TIMESTAMP COLUMN CONSISTENCY:\n');
    const timestampCheck = await pool.query(`
      SELECT table_name, 
        MAX(CASE WHEN column_name = 'created_at' THEN data_type END) as created_at_type,
        MAX(CASE WHEN column_name = 'updated_at' THEN data_type END) as updated_at_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at')
      GROUP BY table_name
      ORDER BY table_name
    `);
    for (const r of timestampCheck.rows) {
      const createdOk = r.created_at_type ? '✅' : '❌ missing';
      const updatedOk = r.updated_at_type ? '✅' : '❌ missing';
      const typeMatch = r.created_at_type === r.updated_at_type ? '' : ' ⚠️ TYPE MISMATCH';
      console.log(`   ${r.table_name}: created_at ${createdOk}, updated_at ${updatedOk}${typeMatch}`);
    }

    // 9. Tables missing updated_at
    console.log('\n📊 TABLES MISSING updated_at:\n');
    const missingUpdated = await pool.query(`
      SELECT t.table_name
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_name = t.table_name 
            AND c.column_name = 'updated_at'
            AND c.table_schema = 'public'
        )
    `);
    if (missingUpdated.rows.length === 0) {
      console.log('   All tables have updated_at');
    } else {
      missingUpdated.rows.forEach(r => console.log(`   ⚠️  ${r.table_name}`));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

deepInspect();
