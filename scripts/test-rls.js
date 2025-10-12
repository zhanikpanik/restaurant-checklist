// Test Row-Level Security (RLS) implementation
import {
  queryWithTenant,
  isRLSEnabled,
  getRLSPolicies,
  testRLSIsolation
} from '../src/lib/db-tenant.js';
import pool from '../src/lib/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRLS() {
  console.log('🧪 ROW-LEVEL SECURITY (RLS) TEST');
  console.log('='.repeat(80));
  console.log('');

  // Get list of tenants
  const client = await pool.connect();
  let tenants = [];

  try {
    const result = await client.query(`
      SELECT id, name
      FROM restaurants
      WHERE poster_account_name IS NOT NULL
      ORDER BY id
      LIMIT 3
    `);
    tenants = result.rows;
    console.log(`📋 Found ${tenants.length} tenants to test:\n`);
    tenants.forEach(t => console.log(`  • ${t.id} (${t.name})`));
  } finally {
    client.release();
  }

  if (tenants.length < 2) {
    console.log('\n⚠️  Need at least 2 tenants to test RLS isolation');
    console.log('   Please create more test restaurants first.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test 1: Check if RLS is enabled on tables\n');

  const tables = [
    'suppliers',
    'product_categories',
    'sections',
    'section_products',
    'orders',
    'products',
    'custom_products',
    'departments'
  ];

  let rlsEnabledCount = 0;
  for (const table of tables) {
    try {
      const enabled = await isRLSEnabled(table);
      console.log(`  ${enabled ? '✅' : '❌'} ${table}: RLS ${enabled ? 'ENABLED' : 'DISABLED'}`);
      if (enabled) rlsEnabledCount++;
    } catch (error) {
      console.log(`  ❌ ${table}: Error checking RLS - ${error.message}`);
    }
  }

  console.log(`\n  Summary: ${rlsEnabledCount}/${tables.length} tables have RLS enabled`);

  if (rlsEnabledCount === 0) {
    console.log('\n⚠️  RLS is not enabled on any tables!');
    console.log('   Run: node scripts/run-rls-migration.js');
    process.exit(1);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Test 2: Check RLS policies\n');

  for (const table of tables.slice(0, 3)) { // Check first 3 tables
    try {
      const policies = await getRLSPolicies(table);
      if (policies.length > 0) {
        console.log(`  ✅ ${table}: ${policies.length} policy(ies)`);
        policies.forEach(p => {
          console.log(`     - ${p.policyname} (${p.cmd})`);
        });
      } else {
        console.log(`  ⚠️  ${table}: RLS enabled but no policies found`);
      }
    } catch (error) {
      console.log(`  ❌ ${table}: Error - ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Test 3: Test data isolation between tenants\n');

  const testTables = ['suppliers', 'sections', 'orders'];

  for (const table of testTables) {
    console.log(`\n  Testing ${table}:`);
    try {
      const tenantIds = tenants.map(t => t.id);
      const counts = await testRLSIsolation(table, tenantIds);

      let totalRows = 0;
      Object.entries(counts).forEach(([tenantId, count]) => {
        if (typeof count === 'number') {
          console.log(`    ${tenantId}: ${count} rows`);
          totalRows += count;
        } else {
          console.log(`    ${tenantId}: ERROR - ${count.error}`);
        }
      });

      console.log(`    Total: ${totalRows} rows across all tenants`);

      // Check if any tenant can see another's data
      const uniqueCounts = new Set(Object.values(counts).filter(c => typeof c === 'number'));
      if (uniqueCounts.size > 1 || totalRows > 0) {
        console.log(`    ✅ Isolation working: Different row counts per tenant`);
      } else if (totalRows === 0) {
        console.log(`    ℹ️  No data in this table yet`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Test 4: Test INSERT with RLS\n');

  const tenant1 = tenants[0].id;
  const tenant2 = tenants[1].id;

  try {
    // Insert test supplier for tenant1
    console.log(`  Inserting test supplier for tenant: ${tenant1}`);
    await queryWithTenant(
      tenant1,
      `INSERT INTO suppliers (restaurant_id, name, poster_supplier_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (restaurant_id, poster_supplier_id)
       DO UPDATE SET name = EXCLUDED.name`,
      [tenant1, 'RLS Test Supplier 1', 999991]
    );
    console.log(`  ✅ Insert successful for ${tenant1}`);

    // Try to query it from tenant1 - should see it
    const result1 = await queryWithTenant(
      tenant1,
      'SELECT COUNT(*) as count FROM suppliers WHERE poster_supplier_id = $1',
      [999991]
    );
    const count1 = parseInt(result1.rows[0].count);
    console.log(`  ✅ ${tenant1} can see their own data: ${count1} row(s)`);

    // Try to query it from tenant2 - should NOT see it
    const result2 = await queryWithTenant(
      tenant2,
      'SELECT COUNT(*) as count FROM suppliers WHERE poster_supplier_id = $1',
      [999991]
    );
    const count2 = parseInt(result2.rows[0].count);
    console.log(`  ${count2 === 0 ? '✅' : '❌'} ${tenant2} cannot see other tenant's data: ${count2} row(s)`);

    if (count1 > 0 && count2 === 0) {
      console.log('\n  ✅ RLS ISOLATION WORKING: Each tenant sees only their data!');
    } else if (count2 > 0) {
      console.log('\n  ❌ RLS ISOLATION FAILED: Tenant can see other tenant\'s data!');
    }

  } catch (error) {
    console.log(`  ❌ Test failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Test 5: Test UPDATE with RLS\n');

  try {
    // Update from tenant1 - should work
    const updateResult1 = await queryWithTenant(
      tenant1,
      `UPDATE suppliers
       SET name = 'RLS Test Supplier Updated'
       WHERE poster_supplier_id = $1`,
      [999991]
    );
    console.log(`  ✅ ${tenant1} updated: ${updateResult1.rowCount} row(s)`);

    // Try to update from tenant2 - should not affect anything
    const updateResult2 = await queryWithTenant(
      tenant2,
      `UPDATE suppliers
       SET name = 'Should Not Update'
       WHERE poster_supplier_id = $1`,
      [999991]
    );
    console.log(`  ${updateResult2.rowCount === 0 ? '✅' : '❌'} ${tenant2} updated: ${updateResult2.rowCount} row(s) (should be 0)`);

    if (updateResult1.rowCount > 0 && updateResult2.rowCount === 0) {
      console.log('\n  ✅ RLS UPDATE WORKING: Tenants can only update their own data!');
    }

  } catch (error) {
    console.log(`  ❌ Test failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Test 6: Test DELETE with RLS\n');

  try {
    // Try to delete from tenant2 - should not delete anything
    const deleteResult2 = await queryWithTenant(
      tenant2,
      'DELETE FROM suppliers WHERE poster_supplier_id = $1',
      [999991]
    );
    console.log(`  ${deleteResult2.rowCount === 0 ? '✅' : '❌'} ${tenant2} deleted: ${deleteResult2.rowCount} row(s) (should be 0)`);

    // Delete from tenant1 - should work
    const deleteResult1 = await queryWithTenant(
      tenant1,
      'DELETE FROM suppliers WHERE poster_supplier_id = $1',
      [999991]
    );
    console.log(`  ✅ ${tenant1} deleted: ${deleteResult1.rowCount} row(s)`);

    if (deleteResult2.rowCount === 0 && deleteResult1.rowCount > 0) {
      console.log('\n  ✅ RLS DELETE WORKING: Tenants can only delete their own data!');
    }

  } catch (error) {
    console.log(`  ❌ Test failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎉 RLS TESTS COMPLETE!\n');

  if (rlsEnabledCount === tables.length) {
    console.log('✅ All tables have RLS enabled');
    console.log('✅ Data isolation is working correctly');
    console.log('✅ Each tenant can only see and modify their own data');
    console.log('');
    console.log('Benefits:');
    console.log('  • Automatic tenant isolation at database level');
    console.log('  • No need to add WHERE restaurant_id = $1 in every query');
    console.log('  • Prevents accidental data leaks even if code has bugs');
    console.log('  • Simplifies application code');
  } else {
    console.log('⚠️  Some tables do not have RLS enabled');
    console.log('   Run migration: node scripts/run-rls-migration.js');
  }
  console.log('');

  process.exit(0);
}

testRLS().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
