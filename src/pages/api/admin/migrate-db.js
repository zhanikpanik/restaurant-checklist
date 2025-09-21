import pool from '../../../lib/db.js';
import { setupDatabaseSchema } from '../../../lib/db-schema.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        console.log('🔧 Manual database migration triggered...');
        
        // First, try to fix the immediate issues with existing tables
        await client.query('BEGIN');
        
        // Check and fix product_categories table
        const categoriesCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'product_categories'
        `);
        
        const categoriesColumns = categoriesCheck.rows.map(row => row.column_name);
        
        if (!categoriesColumns.includes('restaurant_id')) {
            await client.query(`
                ALTER TABLE product_categories 
                ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default';
            `);
            console.log('✅ Added restaurant_id to product_categories');
        }
        
        if (!categoriesColumns.includes('supplier_id')) {
            await client.query(`
                ALTER TABLE product_categories 
                ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
            `);
            console.log('✅ Added supplier_id to product_categories');
        }
        
        // Check and fix orders table
        const ordersCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        `);
        
        const ordersColumns = ordersCheck.rows.map(row => row.column_name);
        
        if (!ordersColumns.includes('restaurant_id')) {
            await client.query(`
                ALTER TABLE orders 
                ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default';
            `);
            console.log('✅ Added restaurant_id to orders');
        }
        
        // Check and fix products table
        const productsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products'
        `);
        
        const productsColumns = productsCheck.rows.map(row => row.column_name);
        
        if (!productsColumns.includes('restaurant_id')) {
            await client.query(`
                ALTER TABLE products 
                ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default';
            `);
            console.log('✅ Added restaurant_id to products');
        }
        
        await client.query('COMMIT');
        
        // Now run the full schema setup
        await setupDatabaseSchema();
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Database migration completed successfully',
            changes: {
                product_categories: !categoriesColumns.includes('restaurant_id') || !categoriesColumns.includes('supplier_id'),
                orders: !ordersColumns.includes('restaurant_id'),
                products: !productsColumns.includes('restaurant_id')
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database migration failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
