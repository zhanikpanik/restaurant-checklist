import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigration() {
  console.log('🔄 Running database migration: Add supplier_id to section_products\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Please check your .env file\n');
    process.exit(1);
  }

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('📡 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected!\n');

    // Read migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_supplier_to_products.sql'),
      'utf8'
    );

    console.log('📝 Running migration SQL...');
    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Changes made:');
    console.log('  - Added supplier_id column to section_products table');
    console.log('  - Migrated existing supplier links from categories to products');
    console.log('  - Created index for better performance\n');

    // Verify the migration
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'section_products' AND column_name = 'supplier_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Verification: supplier_id column exists');
      console.log(`   Type: ${checkResult.rows[0].data_type}\n`);
    }

    // Count products with suppliers
    const countResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM section_products 
      WHERE supplier_id IS NOT NULL
    `);

    console.log(`📊 Products with supplier links: ${countResult.rows[0].count}\n`);

    console.log('Next steps:');
    console.log('  1. Restart your server: npm run dev');
    console.log('  2. Products now link directly to suppliers (no categories needed)');
    console.log('  3. Categories are still available if you want to use them for organization\n');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
