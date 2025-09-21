import pool from '../../../lib/db.js';
import { setupDatabaseSchema } from '../../../lib/db-schema.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        console.log('🔧 Manual database migration triggered...');
        
        const migrationResults = {
            tablesChecked: [],
            columnsAdded: [],
            errors: []
        };
        
        // Check what tables exist first
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        const existingTables = tablesResult.rows.map(row => row.table_name);
        migrationResults.tablesChecked = existingTables;
        console.log('📋 Existing tables:', existingTables);
        
        await client.query('BEGIN');
        
        // 1. Handle product_categories table
        if (existingTables.includes('product_categories')) {
            const categoriesCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'product_categories'
            `);
            
            const categoriesColumns = categoriesCheck.rows.map(row => row.column_name);
            console.log('📋 product_categories columns:', categoriesColumns);
            
            // Add restaurant_id if missing
            if (!categoriesColumns.includes('restaurant_id')) {
                try {
                    await client.query(`
                        ALTER TABLE product_categories 
                        ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
                    `);
                    console.log('✅ Added restaurant_id to product_categories');
                    migrationResults.columnsAdded.push('product_categories.restaurant_id');
                } catch (error) {
                    console.log('⚠️ Could not add restaurant_id to product_categories:', error.message);
                    migrationResults.errors.push(`product_categories.restaurant_id: ${error.message}`);
                }
            }
            
            // Add supplier_id if missing
            if (!categoriesColumns.includes('supplier_id')) {
                try {
                    await client.query(`
                        ALTER TABLE product_categories 
                        ADD COLUMN supplier_id INTEGER;
                    `);
                    
                    // Add foreign key constraint separately if suppliers table exists
                    if (existingTables.includes('suppliers')) {
                        try {
                            await client.query(`
                                ALTER TABLE product_categories 
                                ADD CONSTRAINT fk_product_categories_supplier 
                                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
                            `);
                        } catch (fkError) {
                            console.log('⚠️ Could not add foreign key constraint:', fkError.message);
                        }
                    }
                    
                    console.log('✅ Added supplier_id to product_categories');
                    migrationResults.columnsAdded.push('product_categories.supplier_id');
                } catch (error) {
                    console.log('⚠️ Could not add supplier_id to product_categories:', error.message);
                    migrationResults.errors.push(`product_categories.supplier_id: ${error.message}`);
                }
            }
        }
        
        // 2. Handle orders table
        if (existingTables.includes('orders')) {
            const ordersCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'orders'
            `);
            
            const ordersColumns = ordersCheck.rows.map(row => row.column_name);
            console.log('📋 orders columns:', ordersColumns);
            
            if (!ordersColumns.includes('restaurant_id')) {
                try {
                    await client.query(`
                        ALTER TABLE orders 
                        ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
                    `);
                    console.log('✅ Added restaurant_id to orders');
                    migrationResults.columnsAdded.push('orders.restaurant_id');
                } catch (error) {
                    console.log('⚠️ Could not add restaurant_id to orders:', error.message);
                    migrationResults.errors.push(`orders.restaurant_id: ${error.message}`);
                }
            }
        }
        
        // 3. Handle products table
        if (existingTables.includes('products')) {
            const productsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'products'
            `);
            
            const productsColumns = productsCheck.rows.map(row => row.column_name);
            console.log('📋 products columns:', productsColumns);
            
            if (!productsColumns.includes('restaurant_id')) {
                try {
                    await client.query(`
                        ALTER TABLE products 
                        ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
                    `);
                    console.log('✅ Added restaurant_id to products');
                    migrationResults.columnsAdded.push('products.restaurant_id');
                } catch (error) {
                    console.log('⚠️ Could not add restaurant_id to products:', error.message);
                    migrationResults.errors.push(`products.restaurant_id: ${error.message}`);
                }
            }
        }
        
        await client.query('COMMIT');
        
        // Now run the full schema setup (this will create missing tables)
        try {
            await setupDatabaseSchema();
            console.log('✅ Full schema setup completed');
        } catch (schemaError) {
            console.log('⚠️ Schema setup had issues:', schemaError.message);
            migrationResults.errors.push(`schema_setup: ${schemaError.message}`);
        }
        
        return new Response(JSON.stringify({
            success: migrationResults.errors.length === 0,
            message: migrationResults.errors.length === 0 
                ? 'Database migration completed successfully' 
                : 'Migration completed with some issues',
            results: migrationResults
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database migration failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
