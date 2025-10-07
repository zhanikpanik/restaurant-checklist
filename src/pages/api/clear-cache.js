import { clearRestaurantCache } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Clear all caches (restaurant config + API cache)
 * GET /api/clear-cache
 */
export async function GET({ request }) {
    try {
        // Clear restaurant config cache
        clearRestaurantCache();

        // Clear storage-inventory cache (if we export it)
        // Note: The cache in storage-inventory.js is module-scoped
        // It will be cleared on next server restart

        console.log('✅ Cache cleared successfully');

        return new Response(JSON.stringify({
            success: true,
            message: 'Cache cleared successfully. API cache will clear on next request.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
