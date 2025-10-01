#!/usr/bin/env node

/**
 * Fix cart_items table to support decimal quantities
 * Run this once: node scripts/fix-cart-quantity.js
 */

import pg from 'pg';
import 'dotenv/config';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment variables');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

async function fixCartItemsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing cart_items table to support decimal quantities...');
        
        // Check if table exists
        const tableCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cart_items' AND column_name = 'quantity'
        `);
        
        if (tableCheck.rows.length === 0) {
            console.log('ℹ️  cart_items table does not exist yet or quantity column missing');
            console.log('✅ The table will be created correctly on next server start');
            return;
        }
        
        const currentType = tableCheck.rows[0].data_type;
        console.log(`   Current quantity type: ${currentType}`);
        
        if (currentType === 'numeric') {
            console.log('✅ Quantity column is already NUMERIC - no fix needed!');
            return;
        }
        
        console.log('   Altering column type to NUMERIC(10, 2)...');
        
        // Alter the column type
        await client.query(`
            ALTER TABLE cart_items 
            ALTER COLUMN quantity TYPE NUMERIC(10, 2) USING quantity::numeric;
        `);
        
        console.log('✅ Successfully updated cart_items.quantity to NUMERIC(10, 2)');
        console.log('   You can now save decimal quantities like 0.75');
        
    } catch (error) {
        console.error('❌ Error fixing cart_items table:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the fix
fixCartItemsTable()
    .then(() => {
        console.log('\n🎉 Migration complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });

