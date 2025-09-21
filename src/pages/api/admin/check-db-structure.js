import pool from '../../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        // Get all tables
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        const allTables = tablesResult.rows.map(row => row.table_name);
        
        // Check each important table
        const tableDetails = {};
        
        for (const tableName of ['restaurants', 'suppliers', 'product_categories', 'products', 'orders']) {
            if (allTables.includes(tableName)) {
                // Get columns for this table
                const columnsResult = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [tableName]);
                
                // Get sample data
                let sampleData = [];
                try {
                    const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 3`);
                    sampleData = sampleResult.rows;
                } catch (error) {
                    console.log(`Could not fetch sample data from ${tableName}:`, error.message);
                }
                
                tableDetails[tableName] = {
                    exists: true,
                    columns: columnsResult.rows,
                    sampleData: sampleData,
                    rowCount: sampleData.length
                };
            } else {
                tableDetails[tableName] = {
                    exists: false,
                    columns: [],
                    sampleData: [],
                    rowCount: 0
                };
            }
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                allTables: allTables,
                tableDetails: tableDetails,
                databaseInfo: {
                    hasRestaurants: allTables.includes('restaurants'),
                    hasSuppliers: allTables.includes('suppliers'),
                    hasProductCategories: allTables.includes('product_categories'),
                    hasProducts: allTables.includes('products'),
                    hasOrders: allTables.includes('orders')
                }
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error checking database structure:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
