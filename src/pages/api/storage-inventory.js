import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

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
        console.log(`📦 [${tenantId}] Request URL: ${request.url}`);
        console.log(`📦 [${tenantId}] Cookies: ${request.headers.get('cookie')}`);

        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        console.log(`🔗 [${tenantId}] Using baseUrl: ${baseUrl}`);

        // Fetch storage info
        const storagesUrl = `${baseUrl}/storage.getStorages?token=${token}`;
        console.log(`📡 Fetching storages from: ${storagesUrl.replace(token, '***')}`);

        const storagesResponse = await fetch(storagesUrl);
        const storagesData = await storagesResponse.json();

        if (storagesData.error) {
            throw new Error(`Poster API error: ${storagesData.error.message || JSON.stringify(storagesData.error)}`);
        }

        const storages = storagesData.response || [];
        const storage = storages.find(s => String(s.storage_id) === String(storageId));

        if (!storage) {
            throw new Error(`Storage with ID ${storageId} not found`);
        }

        console.log(`✅ Found storage: ${storage.storage_name}`);

        // Fetch all ingredients
        const ingredientsUrl = `${baseUrl}/menu.getIngredients?token=${token}`;
        console.log(`📡 Fetching ingredients from: ${ingredientsUrl.replace(token, '***')}`);

        const ingredientsRes = await fetch(ingredientsUrl);
        const ingredientsData = await ingredientsRes.json();

        if (ingredientsData.error) {
            throw new Error(`Poster API error: ${ingredientsData.error.message || JSON.stringify(ingredientsData.error)}`);
        }

        const ingredients = ingredientsData.response || [];
        console.log(`✅ Fetched ${ingredients.length} ingredients`);

        // Create ingredient map for quick lookup
        const ingredientMap = {};
        ingredients.forEach(ing => {
            ingredientMap[ing.ingredient_id] = {
                id: ing.ingredient_id,
                name: ing.ingredient_name,
                unit: ing.unit
            };
        });

        // Fetch leftovers for this storage
        const leftoversUrl = `${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${storageId}`;
        console.log(`📡 Fetching leftovers from: ${leftoversUrl.replace(token, '***')}`);

        const leftoversRes = await fetch(leftoversUrl);
        const leftoversData = await leftoversRes.json();

        if (leftoversData.error) {
            throw new Error(`Poster API error: ${leftoversData.error.message || JSON.stringify(leftoversData.error)}`);
        }

        const leftovers = leftoversData.response || [];
        console.log(`✅ Fetched ${leftovers.length} leftovers for storage ${storageId}`);

        // Combine ingredients with leftovers data
        const products = leftovers
            .map(leftover => {
                const ingredient = ingredientMap[leftover.ingredient_id];
                if (!ingredient) return null;

                return {
                    product_id: leftover.ingredient_id,
                    product_name: ingredient.name,
                    unit: ingredient.unit,
                    quantity: parseFloat(leftover.quantity) || 0,
                    is_poster_product: true
                };
            })
            .filter(p => p !== null);

        console.log(`✅ [${tenantId}] Returning ${products.length} products for storage ${storageId}`);

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
