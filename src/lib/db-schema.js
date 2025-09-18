import pool from './db.js';

export async function setupDatabaseSchema() {
    const client = await pool.connect();
    try {
        console.log('🚀 Applying database schema updates...');
        await client.query('BEGIN');

        // 1. Create suppliers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                contact_info TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ `suppliers` table is ready.');

        // 2. Create product_categories table
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                poster_category_id INTEGER UNIQUE, -- Optional: for mapping to Poster categories
                default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ `product_categories` table is ready.');

        // 3. Update cart_items table to include a category and supplier
        // Add category_id column if it doesn't exist
        const hasCategoryId = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name='cart_items' AND column_name='category_id';
        `);
        if (hasCategoryId.rowCount === 0) {
            await client.query('ALTER TABLE cart_items ADD COLUMN category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;');
            console.log('✅ Added `category_id` to `cart_items` table.');
        }

        // Add an explicit supplier_id column for overrides
        const hasSupplierId = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name='cart_items' AND column_name='supplier_id';
        `);
        if (hasSupplierId.rowCount === 0) {
            await client.query('ALTER TABLE cart_items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;');
            console.log('✅ Added `supplier_id` to `cart_items` table.');
        }

        await client.query('COMMIT');
        console.log('🎉 Database schema is up to date.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error applying database schema:', err);
        throw err;
    } finally {
        client.release();
    }
}
