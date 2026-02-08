// Script to query all UNIQUE constraints in the database
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function queryConstraints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Query to get all unique constraints
    const constraintsQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    const result = await client.query(constraintsQuery);

    console.log('📊 UNIQUE CONSTRAINTS IN DATABASE:');
    console.log('='.repeat(80));
    console.log('');

    result.rows.forEach(row => {
      console.log(`Table: ${row.table_name}`);
      console.log(`  Constraint: ${row.constraint_name}`);
      console.log(`  Columns: ${row.columns}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\n📈 Total unique constraints found: ${result.rows.length}\n`);

    // Also check for columns with Poster IDs
    console.log('📊 COLUMNS WITH POSTER IDs:');
    console.log('='.repeat(80));
    console.log('');

    const posterColumnsQuery = `
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name LIKE '%poster%'
      ORDER BY table_name, column_name;
    `;

    const posterResult = await client.query(posterColumnsQuery);

    posterResult.rows.forEach(row => {
      console.log(`${row.table_name}.${row.column_name} (${row.data_type})`);
    });

    console.log('');
    console.log('='.repeat(80));
    console.log(`\n📈 Total Poster-related columns: ${posterResult.rows.length}\n`);

  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

queryConstraints();
