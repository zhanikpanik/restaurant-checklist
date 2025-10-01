import { getDbClient, safeRelease } from '../../../lib/db-helper.js';
import { setupDatabaseSchema } from '../../../lib/db-schema.js';
import pool from '../../../lib/db.js';

export const prerender = false;

/**
 * Migration script to convert single-tenant system to multi-tenant
 * This should be run once when upgrading to multi-tenant architecture
 */
export async function POST({ request }) {
    if (!pool) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Database pool not available'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const { client, error } = await getDbClient();

    
    if (error) return error;

    
    try {
        console.log('🚀 Starting multi-tenant migration...');
        await client.query('BEGIN');
        
        const migrationResults = {
            steps: [],
            errors: [],
            warnings: []
        };
        
        // Step 1: Ensure base schema exists
        try {
            await setupDatabaseSchema();
            migrationResults.steps.push('✅ Base database schema verified');
        } catch (error) {
            migrationResults.errors.push(`❌ Schema setup failed: ${error.message}`);
        }
        
        // Step 2: Add multi-tenant columns to restaurants table
        try {
            await client.query(`
                ALTER TABLE restaurants 
                ADD COLUMN IF NOT EXISTS poster_token VARCHAR(255),
                ADD COLUMN IF NOT EXISTS poster_base_url VARCHAR(255) DEFAULT 'https://joinposter.com/api',
                ADD COLUMN IF NOT EXISTS kitchen_storage_id INTEGER DEFAULT 1,
                ADD COLUMN IF NOT EXISTS bar_storage_id INTEGER DEFAULT 2,
                ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
                ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ru',
                ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true
            `);
            migrationResults.steps.push('✅ Enhanced restaurants table with multi-tenant columns');
        } catch (error) {
            migrationResults.errors.push(`❌ Failed to enhance restaurants table: ${error.message}`);
        }
        
        // Step 3: Update default restaurant with current Poster token
        try {
            const currentToken = process.env.POSTER_TOKEN || '305185:07928627ec76d09e589e1381710e55da';
            await client.query(`
                UPDATE restaurants 
                SET 
                    poster_token = $1,
                    kitchen_storage_id = 1,
                    bar_storage_id = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 'default'
            `, [currentToken]);
            migrationResults.steps.push('✅ Updated default restaurant with Poster configuration');
        } catch (error) {
            migrationResults.errors.push(`❌ Failed to update default restaurant: ${error.message}`);
        }
        
        // Step 4: Add restaurant_id to all tables that need it
        const tablesToMigrate = [
            { table: 'suppliers', hasColumn: false },
            { table: 'product_categories', hasColumn: false },
            { table: 'orders', hasColumn: false },
            { table: 'departments', hasColumn: false },
            { table: 'custom_products', hasColumn: false }
        ];
        
        for (const tableInfo of tablesToMigrate) {
            try {
                // Check if restaurant_id column exists
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = 'restaurant_id'
                `, [tableInfo.table]);
                
                if (columnCheck.rows.length === 0) {
                    // Add restaurant_id column
                    await client.query(`
                        ALTER TABLE ${tableInfo.table} 
                        ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' REFERENCES restaurants(id) ON DELETE CASCADE
                    `);
                    migrationResults.steps.push(`✅ Added restaurant_id column to ${tableInfo.table}`);
                } else {
                    migrationResults.steps.push(`ℹ️ Table ${tableInfo.table} already has restaurant_id column`);
                }
                
                // Update existing records to use 'default' tenant
                const updateResult = await client.query(`
                    UPDATE ${tableInfo.table} 
                    SET restaurant_id = 'default' 
                    WHERE restaurant_id IS NULL
                `);
                
                if (updateResult.rowCount > 0) {
                    migrationResults.steps.push(`✅ Updated ${updateResult.rowCount} records in ${tableInfo.table} to use default tenant`);
                }
                
            } catch (error) {
                migrationResults.errors.push(`❌ Failed to migrate table ${tableInfo.table}: ${error.message}`);
            }
        }
        
        // Step 5: Create indexes for performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id)',
            'CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id)',
            'CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id)',
            'CREATE INDEX IF NOT EXISTS idx_departments_restaurant_id ON departments(restaurant_id)',
            'CREATE INDEX IF NOT EXISTS idx_custom_products_restaurant_id ON custom_products(restaurant_id)'
        ];
        
        for (const indexSql of indexes) {
            try {
                await client.query(indexSql);
                migrationResults.steps.push(`✅ Created index: ${indexSql.split(' ')[5]}`);
            } catch (error) {
                migrationResults.warnings.push(`⚠️ Index creation warning: ${error.message}`);
            }
        }
        
        // Step 6: Verify migration
        try {
            const verificationQueries = [
                'SELECT COUNT(*) as count FROM restaurants WHERE is_active = true',
                'SELECT COUNT(*) as count FROM suppliers WHERE restaurant_id = \'default\'',
                'SELECT COUNT(*) as count FROM product_categories WHERE restaurant_id = \'default\'',
                'SELECT COUNT(*) as count FROM orders WHERE restaurant_id = \'default\''
            ];
            
            const verificationResults = await Promise.all(
                verificationQueries.map(query => client.query(query))
            );
            
            migrationResults.steps.push('✅ Migration verification completed:');
            migrationResults.steps.push(`   - Active restaurants: ${verificationResults[0].rows[0].count}`);
            migrationResults.steps.push(`   - Default suppliers: ${verificationResults[1].rows[0].count}`);
            migrationResults.steps.push(`   - Default categories: ${verificationResults[2].rows[0].count}`);
            migrationResults.steps.push(`   - Default orders: ${verificationResults[3].rows[0].count}`);
            
        } catch (error) {
            migrationResults.warnings.push(`⚠️ Verification warning: ${error.message}`);
        }
        
        // Commit if no critical errors
        if (migrationResults.errors.length === 0) {
            await client.query('COMMIT');
            migrationResults.steps.push('✅ Migration completed successfully');
        } else {
            await client.query('ROLLBACK');
            migrationResults.steps.push('❌ Migration rolled back due to errors');
        }
        
        return new Response(JSON.stringify({
            success: migrationResults.errors.length === 0,
            message: migrationResults.errors.length === 0 
                ? 'Multi-tenant migration completed successfully' 
                : 'Migration failed with errors',
            results: migrationResults
        }), {
            status: migrationResults.errors.length === 0 ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Multi-tenant migration failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Critical migration failure'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

/**
 * GET endpoint to check migration status
 */
export async function GET() {
    if (!pool) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Database pool not available'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const { client, error } = await getDbClient();

    
    if (error) return error;

    
    try {
        // Check if multi-tenant columns exist
        const restaurantColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' AND column_name IN ('poster_token', 'kitchen_storage_id', 'bar_storage_id')
        `);
        
        const hasMultiTenantColumns = restaurantColumns.rows.length >= 3;
        
        // Check restaurant_id columns in other tables
        const tableChecks = await Promise.all([
            client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'"),
            client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'restaurant_id'"),
            client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'restaurant_id'")
        ]);
        
        const hasRestaurantIdColumns = tableChecks.every(result => result.rows.length > 0);
        
        // Get restaurant count
        const restaurantCount = await client.query('SELECT COUNT(*) as count FROM restaurants WHERE is_active = true');
        
        const migrationStatus = {
            is_migrated: hasMultiTenantColumns && hasRestaurantIdColumns,
            has_multi_tenant_columns: hasMultiTenantColumns,
            has_restaurant_id_columns: hasRestaurantIdColumns,
            active_restaurants: parseInt(restaurantCount.rows[0].count),
            migration_needed: !hasMultiTenantColumns || !hasRestaurantIdColumns
        };
        
        return new Response(JSON.stringify({
            success: true,
            data: migrationStatus
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error checking migration status:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
