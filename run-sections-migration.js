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
    console.log('✅ Connected to database');

    // Read and execute the migration
    const migration = await readFile('./scripts/fix-sections-multi-tenant.sql', 'utf-8');

    console.log('🔄 Running migration...');
    const result = await client.query(migration);

    console.log('✅ Migration completed successfully!');
    console.log('\nResults:');

    // Show the last query result (sections by restaurant)
    if (result[result.length - 1]?.rows) {
      console.table(result[result.length - 1].rows);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
  } finally {
    await client.end();
  }
}

runMigration();
