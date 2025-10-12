// Run the Row-Level Security (RLS) migration
import { readFile } from 'fs/promises';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function runRLSMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('⚠️  IMPORTANT: Row-Level Security Migration');
    console.log('='.repeat(80));
    console.log('');
    console.log('This migration will:');
    console.log('  1. Enable Row-Level Security (RLS) on all tenant tables');
    console.log('  2. Create policies to automatically filter by restaurant_id');
    console.log('  3. Require setting app.current_tenant in all queries');
    console.log('');
    console.log('After this migration:');
    console.log('  ✅ Data isolation enforced at database level');
    console.log('  ✅ No need for WHERE restaurant_id = $1 in queries');
    console.log('  ⚠️  Must use getClientWithTenant() or queryWithTenant()');
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // Wait 2 seconds to allow reading
    console.log('Starting migration in 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📋 Reading migration file...');
    const migration = await readFile('./scripts/enable-row-level-security.sql', 'utf-8');

    console.log('🔄 Running RLS migration...\n');
    console.log('='.repeat(80));

    await client.query(migration);

    console.log('='.repeat(80));
    console.log('\n✅ RLS Migration completed successfully!\n');

    // Verify RLS is enabled
    console.log('🔍 Verifying RLS status...\n');

    const rlsCheck = await client.query(`
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'suppliers', 'product_categories', 'sections', 'section_products',
          'orders', 'products', 'custom_products', 'departments'
        )
      ORDER BY tablename
    `);

    console.log('RLS Status:');
    rlsCheck.rows.forEach(row => {
      console.log(`  ${row.rls_enabled ? '✅' : '❌'} ${row.tablename}`);
    });

    const enabledCount = rlsCheck.rows.filter(r => r.rls_enabled).length;
    console.log(`\nTotal: ${enabledCount}/${rlsCheck.rows.length} tables with RLS enabled`);

    // Show policies
    console.log('\n📋 Verifying Policies...\n');

    const policiesCheck = await client.query(`
      SELECT
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename
    `);

    console.log('Policy Counts:');
    policiesCheck.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.policy_count} policy(ies)`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 Next Steps:\n');
    console.log('1. Test RLS:');
    console.log('   node scripts/test-rls.js\n');
    console.log('2. Update application code to use RLS helpers:');
    console.log('   - Use getClientWithTenant(tenantId) for queries');
    console.log('   - Or use queryWithTenant(tenantId, sql, params)\n');
    console.log('3. You can now remove WHERE restaurant_id = $1 from queries');
    console.log('   (RLS automatically filters by tenant)\n');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    console.error('\nRollback instructions:');
    console.error('  To disable RLS on all tables, run:');
    console.error('  ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;');
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Database connection closed\n');
  }
}

console.log('🚀 Starting Row-Level Security Migration\n');
runRLSMigration();
