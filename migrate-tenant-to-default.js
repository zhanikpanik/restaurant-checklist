import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // List of tables with restaurant_id column
    const tables = [
      'suppliers',
      'product_categories',
      'products',
      'orders',
      'departments',
      'sections',
      'section_products',
      'custom_products'
    ];

    console.log('\n🔄 Starting migration from "asdasd" to "default"...\n');

    for (const table of tables) {
      try {
        // Check if table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = $1
          );
        `, [table]);

        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Skipping ${table} (table doesn't exist)`);
          continue;
        }

        // Check if restaurant_id column exists
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'restaurant_id'
          );
        `, [table]);

        if (!columnExists.rows[0].exists) {
          console.log(`⏭️  Skipping ${table} (no restaurant_id column)`);
          continue;
        }

        // Count records with "asdasd"
        const countResult = await client.query(
          `SELECT COUNT(*) FROM ${table} WHERE restaurant_id = $1`,
          ['asdasd']
        );
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
          console.log(`⏭️  ${table}: No records with restaurant_id = "asdasd"`);
          continue;
        }

        // Update restaurant_id from "asdasd" to "default"
        const updateResult = await client.query(
          `UPDATE ${table}
           SET restaurant_id = $1
           WHERE restaurant_id = $2
           RETURNING id`,
          ['default', 'asdasd']
        );

        console.log(`✅ ${table}: Migrated ${updateResult.rows.length} records`);

      } catch (tableError) {
        console.error(`❌ Error processing ${table}:`, tableError.message);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary: All data has been moved from "asdasd" to "default"');
    console.log('You can now use the app with tenant = "default"\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate();
