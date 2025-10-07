import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

// In-memory cache for Poster API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(tenantId, endpoint, params = {}) {
    const paramStr = JSON.stringify(params);
    return `${tenantId}:${endpoint}:${paramStr}`;
}

function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key); // Remove expired entry
    return null;
}

function setCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Get inventory for any storage from Poster
 * GET /api/storage-inventory?storage_id=123
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const url = new URL(request.url);
        const storageId = url.searchParams.get('storage_id');

        if (!storageId) {
            throw new Error('storage_id parameter is required');
        }

        console.log(`📦 [${tenantId}] Fetching inventory for storage ${storageId}...`);

        // Security: Verify this storage belongs to the current tenant
        const ownershipCheck = await client.query(
            `SELECT id FROM departments
             WHERE poster_storage_id = $1
             AND restaurant_id = $2
             AND is_active = true`,
            [storageId, tenantId]
        );

        if (ownershipCheck.rows.length === 0) {
            console.warn(`🚫 [${tenantId}] Unauthorized access attempt to storage ${storageId}`);
            throw new Error('Storage not found or access denied');
        }

        console.log(`✅ [${tenantId}] Storage ownership verified`);

        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        // Try to get storages from cache
        const storagesCacheKey = getCacheKey(tenantId, 'storage.getStorages');
        let storages = getFromCache(storagesCacheKey);

        if (!storages) {
            // Fetch storage info from Poster
            const storagesUrl = `${baseUrl}/storage.getStorages?token=${token}`;
            const storagesResponse = await fetch(storagesUrl);
            const storagesData = await storagesResponse.json();

            if (storagesData.error) {
                throw new Error(`Poster API error: ${storagesData.error.message || JSON.stringify(storagesData.error)}`);
            }

            storages = storagesData.response || [];
            setCache(storagesCacheKey, storages);
        }
        const storage = storages.find(s => String(s.storage_id) === String(storageId));

        if (!storage) {
            throw new Error(`Storage with ID ${storageId} not found`);
        }

        // Try to get leftovers from cache
        const leftoversCacheKey = getCacheKey(tenantId, 'storage.getStorageLeftovers', { storage_id: storageId });
        let leftovers = getFromCache(leftoversCacheKey);

        if (!leftovers) {
            // Fetch leftovers from Poster
            const leftoversUrl = `${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${storageId}`;
            const leftoversRes = await fetch(leftoversUrl);
            const leftoversData = await leftoversRes.json();

            if (leftoversData.error) {
                throw new Error(`Poster API error: ${leftoversData.error.message || JSON.stringify(leftoversData.error)}`);
            }

            leftovers = leftoversData.response || [];
            setCache(leftoversCacheKey, leftovers);
        }

        console.log(`📊 [${tenantId}] [v2] Found ${leftovers.length} leftovers for storage ${storageId}`);

        // Get unique ingredient IDs from leftovers - convert to strings for consistent comparison
        const ingredientIds = [...new Set(leftovers.map(l => String(l.ingredient_id)))];
        console.log(`🔢 [${tenantId}] [v2] Unique ingredient IDs: ${ingredientIds.length}`, ingredientIds.slice(0, 5));

        // Try to get ingredients from cache
        const ingredientsCacheKey = getCacheKey(tenantId, 'menu.getIngredients');
        let allIngredients = getFromCache(ingredientsCacheKey);

        if (!allIngredients) {
            // Fetch all ingredients from Poster
            const ingredientsUrl = `${baseUrl}/menu.getIngredients?token=${token}`;
            const ingredientsRes = await fetch(ingredientsUrl);
            const ingredientsData = await ingredientsRes.json();

            if (ingredientsData.error) {
                throw new Error(`Poster API error: ${ingredientsData.error.message || JSON.stringify(ingredientsData.error)}`);
            }

            allIngredients = ingredientsData.response || [];
            setCache(ingredientsCacheKey, allIngredients);
        }

        // Filter to only ingredients we need for this storage - convert IDs to strings for comparison
        const relevantIngredients = allIngredients.filter(ing =>
            ingredientIds.includes(String(ing.ingredient_id))
        );

        console.log(`🔍 [${tenantId}] Total ingredients from Poster: ${allIngredients.length}, Relevant: ${relevantIngredients.length}`);
        if (relevantIngredients.length > 0) {
            console.log(`📝 [${tenantId}] Sample relevant ingredients:`, relevantIngredients.slice(0, 3).map(i => ({ id: i.ingredient_id, name: i.ingredient_name })));
        }

        // Create ingredient map for quick lookup - use string keys
        const ingredientMap = {};
        relevantIngredients.forEach(ing => {
            ingredientMap[String(ing.ingredient_id)] = {
                id: ing.ingredient_id,
                name: ing.ingredient_name,
                unit: ing.unit
            };
        });

        // Combine ingredients with leftovers data
        const products = leftovers
            .map(leftover => {
                const ingredient = ingredientMap[String(leftover.ingredient_id)];
                if (!ingredient) {
                    console.warn(`⚠️ [${tenantId}] Leftover ingredient ${leftover.ingredient_id} (${typeof leftover.ingredient_id}) not found in ingredientMap`);
                    return null;
                }

                // Poster API returns different field names for quantity
                const quantity = parseFloat(leftover.ingredient_left || leftover.storage_ingredient_left || leftover.quantity) || 0;

                return {
                    product_id: leftover.ingredient_id,
                    product_name: ingredient.name,
                    unit: ingredient.unit,
                    quantity: quantity,
                    is_poster_product: true
                };
            })
            .filter(p => p !== null);

        console.log(`✅ [${tenantId}] Returning ${products.length} products for storage ${storageId} (filtered from ${leftovers.length} leftovers)`);

        return new Response(JSON.stringify({
            success: true,
            data: products,
            storage: {
                id: storage.storage_id,
                name: storage.storage_name,
                emoji: getEmojiForStorage(storage.storage_name)
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`❌ [${tenantId}] Error fetching storage inventory:`, error);
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

// Helper function to assign emoji based on storage name
function getEmojiForStorage(storageName) {
    const name = storageName.toLowerCase();

    if (name.includes('кухн') || name.includes('kitchen')) return '🍳';
    if (name.includes('бар') || name.includes('bar')) return '🍷';
    if (name.includes('склад') || name.includes('storage') || name.includes('warehouse')) return '📦';
    if (name.includes('офис') || name.includes('office')) return '🏢';
    if (name.includes('горничн') || name.includes('housekeeping')) return '🧹';
    if (name.includes('ресепшн') || name.includes('reception')) return '🔔';

    return '📍'; // Default emoji
}
