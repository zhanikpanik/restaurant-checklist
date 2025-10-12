// Test that multiple restaurants can have the same Poster IDs
// This verifies the composite unique constraints are working
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testSamePosterIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('🧪 TESTING SAME POSTER IDs ACROSS RESTAURANTS');
    console.log('='.repeat(80));
    console.log('');

    // Test data
    const testPosterSupplierId = 999999;
    const testPosterStorageId = 999999;
    const testPosterCategoryId = 999999;

    await client.query('BEGIN');

    console.log('📝 Test 1: Insert suppliers with same poster_supplier_id\n');

    // Try to insert supplier with same Poster ID for different restaurants
    try {
      // Restaurant 1
      await client.query(`
        INSERT INTO suppliers (restaurant_id, name, poster_supplier_id)
        VALUES ('default', 'Test Supplier for Default', $1)
        ON CONFLICT (restaurant_id, poster_supplier_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterSupplierId]);
      console.log('✅ Inserted/Updated supplier for restaurant "default"');

      // Restaurant 2
      await client.query(`
        INSERT INTO suppliers (restaurant_id, name, poster_supplier_id)
        VALUES ('245580', 'Test Supplier for 245580', $1)
        ON CONFLICT (restaurant_id, poster_supplier_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterSupplierId]);
      console.log('✅ Inserted/Updated supplier for restaurant "245580"');

      // Verify both exist
      const result = await client.query(`
        SELECT restaurant_id, name, poster_supplier_id
        FROM suppliers
        WHERE poster_supplier_id = $1
        ORDER BY restaurant_id
      `, [testPosterSupplierId]);

      console.log(`\n✅ SUCCESS: Found ${result.rows.length} suppliers with poster_supplier_id=${testPosterSupplierId}:`);
      result.rows.forEach(row => {
        console.log(`   Restaurant: ${row.restaurant_id}, Name: "${row.name}"`);
      });

      if (result.rows.length !== 2) {
        throw new Error(`Expected 2 suppliers, found ${result.rows.length}`);
      }

    } catch (error) {
      console.error('❌ FAILED: Could not insert suppliers with same Poster ID');
      throw error;
    }

    console.log('\n' + '-'.repeat(80) + '\n');
    console.log('📝 Test 2: Insert sections with same poster_storage_id\n');

    try {
      // Restaurant 1
      await client.query(`
        INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id)
        VALUES ('default', 'Test Storage for Default', '🧪', $1)
        ON CONFLICT (restaurant_id, poster_storage_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterStorageId]);
      console.log('✅ Inserted/Updated section for restaurant "default"');

      // Restaurant 2
      await client.query(`
        INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id)
        VALUES ('245580', 'Test Storage for 245580', '🧪', $1)
        ON CONFLICT (restaurant_id, poster_storage_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterStorageId]);
      console.log('✅ Inserted/Updated section for restaurant "245580"');

      // Verify both exist
      const result = await client.query(`
        SELECT restaurant_id, name, poster_storage_id
        FROM sections
        WHERE poster_storage_id = $1
        ORDER BY restaurant_id
      `, [testPosterStorageId]);

      console.log(`\n✅ SUCCESS: Found ${result.rows.length} sections with poster_storage_id=${testPosterStorageId}:`);
      result.rows.forEach(row => {
        console.log(`   Restaurant: ${row.restaurant_id}, Name: "${row.name}"`);
      });

      if (result.rows.length !== 2) {
        throw new Error(`Expected 2 sections, found ${result.rows.length}`);
      }

    } catch (error) {
      console.error('❌ FAILED: Could not insert sections with same Poster ID');
      throw error;
    }

    console.log('\n' + '-'.repeat(80) + '\n');
    console.log('📝 Test 3: Insert categories with same poster_category_id\n');

    try {
      // Restaurant 1
      await client.query(`
        INSERT INTO product_categories (restaurant_id, name, poster_category_id)
        VALUES ('default', 'Test Category for Default', $1)
        ON CONFLICT (restaurant_id, poster_category_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterCategoryId]);
      console.log('✅ Inserted/Updated category for restaurant "default"');

      // Restaurant 2
      await client.query(`
        INSERT INTO product_categories (restaurant_id, name, poster_category_id)
        VALUES ('245580', 'Test Category for 245580', $1)
        ON CONFLICT (restaurant_id, poster_category_id)
        DO UPDATE SET name = EXCLUDED.name
      `, [testPosterCategoryId]);
      console.log('✅ Inserted/Updated category for restaurant "245580"');

      // Verify both exist
      const result = await client.query(`
        SELECT restaurant_id, name, poster_category_id
        FROM product_categories
        WHERE poster_category_id = $1
        ORDER BY restaurant_id
      `, [testPosterCategoryId]);

      console.log(`\n✅ SUCCESS: Found ${result.rows.length} categories with poster_category_id=${testPosterCategoryId}:`);
      result.rows.forEach(row => {
        console.log(`   Restaurant: ${row.restaurant_id}, Name: "${row.name}"`);
      });

      if (result.rows.length !== 2) {
        throw new Error(`Expected 2 categories, found ${result.rows.length}`);
      }

    } catch (error) {
      console.error('❌ FAILED: Could not insert categories with same Poster ID');
      throw error;
    }

    // Clean up test data
    console.log('\n' + '-'.repeat(80) + '\n');
    console.log('🧹 Cleaning up test data...\n');

    await client.query('DELETE FROM suppliers WHERE poster_supplier_id = $1', [testPosterSupplierId]);
    await client.query('DELETE FROM sections WHERE poster_storage_id = $1', [testPosterStorageId]);
    await client.query('DELETE FROM product_categories WHERE poster_category_id = $1', [testPosterCategoryId]);

    console.log('✅ Test data cleaned up');

    await client.query('COMMIT');

    console.log('');
    console.log('='.repeat(80));
    console.log('\n🎉 ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('  ✅ Multiple restaurants can have suppliers with same Poster IDs');
    console.log('  ✅ Multiple restaurants can have sections with same Poster IDs');
    console.log('  ✅ Multiple restaurants can have categories with same Poster IDs');
    console.log('  ✅ Composite unique constraints are working correctly');
    console.log('  ✅ System is ready for 100+ restaurants!');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    console.error('\n💡 This means the composite unique constraints are not working properly.');
    console.error('   Please re-run the migration: node scripts/run-multi-tenant-migration.js');
    process.exit(1);
  } finally {
    await client.end();
  }
}

testSamePosterIds();
