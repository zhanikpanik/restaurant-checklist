import pool from '../../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        console.log('ADMIN: Manual database migration triggered...');
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
                poster_category_id INTEGER UNIQUE,
                default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ `product_categories` table is ready.');

        // 3. Create cart_items table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                product_id VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit VARCHAR(50),
                department VARCHAR(100) NOT NULL,
                restaurant_id VARCHAR(100) DEFAULT 'default_restaurant' NOT NULL,
                category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ `cart_items` table is ready.');

        // 4. Add category_id column if it doesn't exist (for existing installations)
        const hasCategoryId = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name='cart_items' AND column_name='category_id';
        `);
        if (hasCategoryId.rowCount === 0) {
            await client.query('ALTER TABLE cart_items ADD COLUMN category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;');
            console.log('✅ Added `category_id` to `cart_items` table.');
        }

        // 5. Add supplier_id column if it doesn't exist (for existing installations)
        const hasSupplierId = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name='cart_items' AND column_name='supplier_id';
        `);
        if (hasSupplierId.rowCount === 0) {
            await client.query('ALTER TABLE cart_items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;');
            console.log('✅ Added `supplier_id` to `cart_items` table.');
        }

        // 6. Create products table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                unit VARCHAR(50),
                category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
                last_synced_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ `products` table is ready.');

        await client.query('COMMIT');
        console.log('ADMIN: Manual database migration completed successfully.');
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Database schema updated successfully. All tables should now exist.' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ADMIN: Manual database migration failed:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to update database schema.',
            details: error.message || 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
