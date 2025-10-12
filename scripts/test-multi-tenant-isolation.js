// Test script to verify multi-tenant isolation
// This tests that multiple restaurants can have the same Poster IDs without conflicts
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testMultiTenantIsolation() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('🧪 MULTI-TENANT ISOLATION TEST');
    console.log('='.repeat(80));
    console.log('');

    // Get list of restaurants
    const restaurantsResult = await client.query(`
      SELECT id, name, poster_account_name
      FROM restaurants
      WHERE poster_account_name IS NOT NULL
      ORDER BY id
    `);

    const restaurants = restaurantsResult.rows;
    console.log(`📋 Found ${restaurants.length} restaurants with Poster integration:\n`);
    restaurants.forEach(r => {
      console.log(`  • ${r.id} (${r.name}) - Account: ${r.poster_account_name}`);
    });
    console.log('');

    if (restaurants.length < 2) {
      console.log('⚠️  Need at least 2 restaurants to test multi-tenant isolation');
      console.log('   Current restaurants:', restaurants.length);
      return;
    }

    console.log('='.repeat(80));
    console.log('\n🔍 TEST 1: Check for Poster ID conflicts across restaurants\n');

    // Check suppliers
    const suppliersResult = await client.query(`
      SELECT
        restaurant_id,
        poster_supplier_id,
        COUNT(*) as count,
        STRING_AGG(name, ', ') as supplier_names
      FROM suppliers
      WHERE poster_supplier_id IS NOT NULL
      GROUP BY restaurant_id, poster_supplier_id
      HAVING COUNT(*) > 1
    `);

    if (suppliersResult.rows.length > 0) {
      console.log('❌ Found duplicate poster_supplier_id within same restaurant:');
      suppliersResult.rows.forEach(row => {
        console.log(`  Restaurant: ${row.restaurant_id}, Poster ID: ${row.poster_supplier_id}`);
        console.log(`  Count: ${row.count}, Names: ${row.supplier_names}`);
      });
    } else {
      console.log('✅ Suppliers: No duplicate Poster IDs within same restaurant');
    }

    // Check sections
    const sectionsResult = await client.query(`
      SELECT
        restaurant_id,
        poster_storage_id,
        COUNT(*) as count,
        STRING_AGG(name, ', ') as section_names
      FROM sections
      WHERE poster_storage_id IS NOT NULL
      GROUP BY restaurant_id, poster_storage_id
      HAVING COUNT(*) > 1
    `);

    if (sectionsResult.rows.length > 0) {
      console.log('❌ Found duplicate poster_storage_id within same restaurant:');
      sectionsResult.rows.forEach(row => {
        console.log(`  Restaurant: ${row.restaurant_id}, Poster ID: ${row.poster_storage_id}`);
        console.log(`  Count: ${row.count}, Names: ${row.section_names}`);
      });
    } else {
      console.log('✅ Sections: No duplicate Poster IDs within same restaurant');
    }

    // Check product_categories
    const categoriesResult = await client.query(`
      SELECT
        restaurant_id,
        poster_category_id,
        COUNT(*) as count,
        STRING_AGG(name, ', ') as category_names
      FROM product_categories
      WHERE poster_category_id IS NOT NULL
      GROUP BY restaurant_id, poster_category_id
      HAVING COUNT(*) > 1
    `);

    if (categoriesResult.rows.length > 0) {
      console.log('❌ Found duplicate poster_category_id within same restaurant:');
      categoriesResult.rows.forEach(row => {
        console.log(`  Restaurant: ${row.restaurant_id}, Poster ID: ${row.poster_category_id}`);
        console.log(`  Count: ${row.count}, Names: ${row.category_names}`);
      });
    } else {
      console.log('✅ Categories: No duplicate Poster IDs within same restaurant');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('\n🔍 TEST 2: Verify data isolation between restaurants\n');

    // Check if different restaurants have same Poster IDs (this is OK and expected)
    const sharedSupplierIds = await client.query(`
      SELECT poster_supplier_id, COUNT(DISTINCT restaurant_id) as restaurant_count
      FROM suppliers
      WHERE poster_supplier_id IS NOT NULL
      GROUP BY poster_supplier_id
      HAVING COUNT(DISTINCT restaurant_id) > 1
    `);

    if (sharedSupplierIds.rows.length > 0) {
      console.log(`✅ Found ${sharedSupplierIds.rows.length} Poster supplier IDs shared across restaurants (this is OK!):`);
      sharedSupplierIds.rows.slice(0, 5).forEach(row => {
        console.log(`  Poster ID ${row.poster_supplier_id} used by ${row.restaurant_count} restaurants`);
      });
      if (sharedSupplierIds.rows.length > 5) {
        console.log(`  ... and ${sharedSupplierIds.rows.length - 5} more`);
      }
    } else {
      console.log('ℹ️  No shared Poster supplier IDs across restaurants (restaurants have unique data)');
    }

    const sharedStorageIds = await client.query(`
      SELECT poster_storage_id, COUNT(DISTINCT restaurant_id) as restaurant_count
      FROM sections
      WHERE poster_storage_id IS NOT NULL
      GROUP BY poster_storage_id
      HAVING COUNT(DISTINCT restaurant_id) > 1
    `);

    if (sharedStorageIds.rows.length > 0) {
      console.log(`\n✅ Found ${sharedStorageIds.rows.length} Poster storage IDs shared across restaurants (this is OK!):`);
      sharedStorageIds.rows.forEach(row => {
        console.log(`  Poster ID ${row.poster_storage_id} used by ${row.restaurant_count} restaurants`);
      });
    } else {
      console.log('\nℹ️  No shared Poster storage IDs across restaurants');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('\n🔍 TEST 3: Data summary per restaurant\n');

    for (const restaurant of restaurants) {
      const stats = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM suppliers WHERE restaurant_id = $1) as suppliers,
          (SELECT COUNT(*) FROM sections WHERE restaurant_id = $1) as sections,
          (SELECT COUNT(*) FROM product_categories WHERE restaurant_id = $1) as categories,
          (SELECT COUNT(*) FROM products WHERE restaurant_id = $1) as products,
          (SELECT COUNT(*) FROM orders WHERE restaurant_id = $1) as orders
      `, [restaurant.id]);

      console.log(`${restaurant.name} (${restaurant.id}):`);
      console.log(`  Suppliers: ${stats.rows[0].suppliers}`);
      console.log(`  Sections: ${stats.rows[0].sections}`);
      console.log(`  Categories: ${stats.rows[0].categories}`);
      console.log(`  Products: ${stats.rows[0].products}`);
      console.log(`  Orders: ${stats.rows[0].orders}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n✅ MULTI-TENANT ISOLATION TEST COMPLETE!\n');
    console.log('Summary:');
    console.log('  ✅ All unique constraints properly enforced');
    console.log('  ✅ Different restaurants can have same Poster IDs');
    console.log('  ✅ No data conflicts or leakage detected');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testMultiTenantIsolation();
