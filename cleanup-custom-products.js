import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function cleanupCustomProducts() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('🧹 Starting cleanup of custom products...\n');

        // 1. Show all custom products before cleanup
        const beforeResult = await pool.query(`
            SELECT id, name, department_id, is_active, restaurant_id
            FROM custom_products
            WHERE restaurant_id = 'default'
            ORDER BY is_active DESC, id ASC
        `);

        console.log(`📊 Found ${beforeResult.rows.length} total custom products:`);
        console.log('---');
        beforeResult.rows.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name} | Active: ${p.is_active} | Dept: ${p.department_id || 'NULL'}`);
        });
        console.log('\n');

        // 2. Option to mark all as inactive
        console.log('🔧 Marking all custom products as inactive...');
        const updateResult = await pool.query(`
            UPDATE custom_products
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE restaurant_id = 'default' AND is_active = true
            RETURNING id, name
        `);

        console.log(`✅ Marked ${updateResult.rows.length} products as inactive:`);
        updateResult.rows.forEach(p => {
            console.log(`  - ${p.name} (ID: ${p.id})`);
        });

        console.log('\n');

        // 3. Option to permanently delete all inactive products (commented out by default)
        // Uncomment the block below if you want to permanently delete instead of soft delete
        /*
        console.log('🗑️  Permanently deleting inactive custom products...');
        const deleteResult = await pool.query(`
            DELETE FROM custom_products
            WHERE restaurant_id = 'default' AND is_active = false
            RETURNING id, name
        `);

        console.log(`✅ Permanently deleted ${deleteResult.rows.length} products:`);
        deleteResult.rows.forEach(p => {
            console.log(`  - ${p.name} (ID: ${p.id})`);
        });
        */

        console.log('\n✨ Cleanup complete!');

        // 4. Show remaining products
        const afterResult = await pool.query(`
            SELECT id, name, department_id, is_active
            FROM custom_products
            WHERE restaurant_id = 'default'
            ORDER BY is_active DESC, id ASC
        `);

        console.log(`\n📊 Remaining custom products: ${afterResult.rows.length}`);
        if (afterResult.rows.length > 0) {
            console.log('---');
            afterResult.rows.forEach(p => {
                console.log(`ID: ${p.id} | Name: ${p.name} | Active: ${p.is_active} | Dept: ${p.department_id || 'NULL'}`);
            });
        }

    } catch (error) {
        console.error('❌ Cleanup error:', error);
    } finally {
        await pool.end();
    }
}

cleanupCustomProducts();
