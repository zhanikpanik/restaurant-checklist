// Run the comprehensive multi-tenant constraints migration
import { readFile } from 'fs/promises';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Reading migration file...');
    const migration = await readFile('./scripts/fix-all-multi-tenant-constraints.sql', 'utf-8');

    console.log('🔄 Running migration...\n');
    console.log('='.repeat(80));

    const result = await client.query(migration);

    console.log('='.repeat(80));
    console.log('\n✅ Migration completed successfully!');

    // The SELECT query at the end will be in the result
    if (result.rows && result.rows.length > 0) {
      console.log('\n📊 Updated Constraints:');
      console.log('='.repeat(80));
      result.rows.forEach(row => {
        console.log(`\n${row.table_name}:`);
        console.log(`  ${row.constraint_name}`);
        console.log(`  Columns: ${row.columns}`);
      });
      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

console.log('🚀 Starting Phase 1: Multi-Tenant Constraints Migration\n');
runMigration();
