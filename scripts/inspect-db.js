require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  try {
    // Get all tables and columns
    const columns = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema='public' 
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('=== TABLES AND COLUMNS ===\n');
    let currentTable = '';
    for (const row of columns.rows) {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n📋 ${currentTable.toUpperCase()}`);
      }
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    }

    // Get foreign keys
    const fks = await pool.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column 
      FROM information_schema.table_constraints tc 
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('\n\n=== FOREIGN KEYS ===\n');
    for (const row of fks.rows) {
      console.log(`${row.table_name}.${row.column_name} -> ${row.foreign_table}.${row.foreign_column}`);
    }

    // Get indexes
    const indexes = await pool.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname='public' 
      ORDER BY tablename
    `);
    
    console.log('\n\n=== INDEXES ===\n');
    currentTable = '';
    for (const row of indexes.rows) {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n📋 ${currentTable}`);
      }
      console.log(`   ${row.indexname}`);
    }

    // Get table row counts
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `);
    
    console.log('\n\n=== ROW COUNTS ===\n');
    for (const t of tables.rows) {
      const count = await pool.query(`SELECT COUNT(*) FROM "${t.tablename}"`);
      console.log(`${t.tablename}: ${count.rows[0].count} rows`);
    }

    // Check for orphaned records
    console.log('\n\n=== POTENTIAL ISSUES ===\n');
    
    // Products without category
    const noCategory = await pool.query(`SELECT COUNT(*) FROM products WHERE category_id IS NULL`);
    console.log(`Products without category: ${noCategory.rows[0].count}`);
    
    // Products without supplier
    const noSupplier = await pool.query(`SELECT COUNT(*) FROM products WHERE supplier_id IS NULL`);
    console.log(`Products without supplier: ${noSupplier.rows[0].count}`);
    
    // Inactive users
    const inactiveUsers = await pool.query(`SELECT COUNT(*) FROM users WHERE is_active = false`);
    console.log(`Inactive users: ${inactiveUsers.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

inspect();
