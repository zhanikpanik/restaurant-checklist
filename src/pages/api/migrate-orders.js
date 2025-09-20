import { migrateLocalStorageOrders } from '../../lib/orderStorage-postgres.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        console.log('🔄 Starting order migration from localStorage to PostgreSQL...');
        
        const { barOrders, kitchenOrders } = await request.json();
        const tenantId = locals.tenantId || 'default';
        
        let totalMigrated = 0;
        
        // Migrate bar orders
        if (barOrders && Array.isArray(barOrders) && barOrders.length > 0) {
            const barMigrated = await migrateLocalStorageOrders(barOrders, 'bar', tenantId);
            totalMigrated += barMigrated;
            console.log(`✅ Migrated ${barMigrated} bar orders`);
        }
        
        // Migrate kitchen orders
        if (kitchenOrders && Array.isArray(kitchenOrders) && kitchenOrders.length > 0) {
            const kitchenMigrated = await migrateLocalStorageOrders(kitchenOrders, 'kitchen', tenantId);
            totalMigrated += kitchenMigrated;
            console.log(`✅ Migrated ${kitchenMigrated} kitchen orders`);
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: `Successfully migrated ${totalMigrated} orders to PostgreSQL`,
            migrated: {
                bar: barOrders?.length || 0,
                kitchen: kitchenOrders?.length || 0,
                total: totalMigrated
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to migrate orders:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
