import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Adding category_id column to section_products...');

        await pool.query(`
            ALTER TABLE section_products
            ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;
        `);

        console.log('✅ Migration complete!');

        // Verify
        const result = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'section_products' AND column_name = 'category_id';
        `);

        if (result.rows.length > 0) {
            console.log('✅ Verified: category_id column exists');
        } else {
            console.log('❌ Warning: category_id column not found');
        }

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrate();
