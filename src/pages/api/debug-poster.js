import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Debug endpoint to check Poster API responses
 * GET /api/debug-poster?storage_id=1
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);

    try {
        const url = new URL(request.url);
        const storageId = url.searchParams.get('storage_id');

        if (!storageId) {
            throw new Error('storage_id parameter is required');
        }

        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        console.log(`🔍 [${tenantId}] Debug: Fetching Poster data for storage ${storageId}`);
        console.log(`🔑 [${tenantId}] Token: ${token.substring(0, 15)}...`);
        console.log(`🌐 [${tenantId}] Base URL: ${baseUrl}`);

        // Fetch ingredients
        const ingredientsUrl = `${baseUrl}/menu.getIngredients?token=${token}`;
        const ingredientsRes = await fetch(ingredientsUrl);
        const ingredientsData = await ingredientsRes.json();

        if (ingredientsData.error) {
            throw new Error(`Ingredients API error: ${JSON.stringify(ingredientsData.error)}`);
        }

        const ingredients = ingredientsData.response || [];
        const ingredientIds = ingredients.map(i => ({ id: i.ingredient_id, type: typeof i.ingredient_id, name: i.ingredient_name }));

        // Fetch leftovers
        const leftoversUrl = `${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${storageId}`;
        const leftoversRes = await fetch(leftoversUrl);
        const leftoversData = await leftoversRes.json();

        if (leftoversData.error) {
            throw new Error(`Leftovers API error: ${JSON.stringify(leftoversData.error)}`);
        }

        const leftovers = leftoversData.response || [];
        const leftoverIds = leftovers.map(l => ({ id: l.ingredient_id, type: typeof l.ingredient_id }));

        // Find matches
        const leftoverIdsSet = new Set(leftovers.map(l => String(l.ingredient_id)));
        const ingredientIdsSet = new Set(ingredients.map(i => String(i.ingredient_id)));

        const matches = [...leftoverIdsSet].filter(id => ingredientIdsSet.has(id));
        const leftoverOnly = [...leftoverIdsSet].filter(id => !ingredientIdsSet.has(id));
        const ingredientOnly = [...ingredientIdsSet].filter(id => !leftoverIdsSet.has(id));

        return new Response(JSON.stringify({
            success: true,
            tenant: tenantId,
            storageId: storageId,
            summary: {
                totalIngredients: ingredients.length,
                totalLeftovers: leftovers.length,
                matches: matches.length,
                leftoverOnly: leftoverOnly.length,
                ingredientOnly: ingredientOnly.length
            },
            sampleData: {
                ingredients: ingredientIds.slice(0, 10),
                leftovers: leftoverIds.slice(0, 10)
            },
            matches: matches,
            leftoverOnly: leftoverOnly,
            ingredientOnly: ingredientOnly.slice(0, 20)
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`❌ [${tenantId}] Debug error:`, error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
