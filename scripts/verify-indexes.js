// Script to verify all indexes exist, especially on restaurant_id columns
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function verifyIndexes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Query to get all indexes on restaurant_id columns
    const indexQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (
          indexdef LIKE '%restaurant_id%'
          OR indexname LIKE '%restaurant%'
        )
      ORDER BY tablename, indexname;
    `;

    const result = await client.query(indexQuery);

    console.log('📊 INDEXES ON restaurant_id COLUMNS:');
    console.log('='.repeat(80));
    console.log('');

    const tableIndexes = {};
    result.rows.forEach(row => {
      if (!tableIndexes[row.tablename]) {
        tableIndexes[row.tablename] = [];
      }
      tableIndexes[row.tablename].push({
        name: row.indexname,
        def: row.indexdef
      });
    });

    Object.keys(tableIndexes).sort().forEach(table => {
      console.log(`Table: ${table}`);
      tableIndexes[table].forEach(idx => {
        console.log(`  ✓ ${idx.name}`);
        console.log(`    ${idx.def}`);
      });
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\n📈 Total restaurant-related indexes: ${result.rows.length}\n`);

    // Check which tables have restaurant_id but might be missing indexes
    const tablesQuery = `
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'restaurant_id'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    console.log('📋 TABLES WITH restaurant_id COLUMN:');
    console.log('='.repeat(80));
    tablesResult.rows.forEach(row => {
      const hasIndex = tableIndexes[row.table_name] &&
                      tableIndexes[row.table_name].length > 0;
      const status = hasIndex ? '✅' : '⚠️  MISSING INDEX';
      console.log(`  ${status} ${row.table_name}`);
    });
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyIndexes();
