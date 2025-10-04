import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

// Helper function to save categories to our database
async function saveCategoriesToDb(categories, tenantId) {
    if (!categories || categories.size === 0) return;

    const { client, error } = await getDbClient();


    if (error) return error;

    try {
        await client.query('BEGIN');
        const query = `
            INSERT INTO product_categories (name, poster_category_id, restaurant_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (poster_category_id, restaurant_id) DO NOTHING;
        `;
        for (const [id, name] of categories) {
            await client.query(query, [name, id, tenantId]);
        }
        await client.query('COMMIT');
        console.log(`💾 Synced ${categories.size} categories to the database for tenant ${tenantId}.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error saving categories to DB:', error);
    } finally {
        safeRelease(client);
    }
}

export async function GET({ request }) {
    // Get tenant-specific configuration
    const tenantId = getTenantId(request);
    const posterConfig = await getPosterConfig(tenantId);

    const token = posterConfig.token;
    const baseUrl = posterConfig.baseUrl;
    const kitchenStorageId = posterConfig.kitchenStorageId;
    
    try {
        console.log(`🍽️ [${tenantId}] Fetching KITCHEN inventory and ingredient details from Poster...`);

        // 1. Fetch all ingredient details (including categories)
        const ingredientsDetailsRes = await fetch(`${baseUrl}/menu.getIngredients?token=${token}`);
        const ingredientsDetailsData = await ingredientsDetailsRes.json();
        if (ingredientsDetailsData.error) throw new Error(`Poster API error (getIngredients): ${ingredientsDetailsData.error.message}`);

        const allIngredients = ingredientsDetailsData.response;
        const ingredientMap = new Map(allIngredients.map(ing => [ing.ingredient_id, ing]));
        console.log(`✅ [${tenantId}] Loaded details for ${allIngredients.length} ingredients.`);

        // 2. Fetch inventory leftovers for the KITCHEN storage (tenant-specific storage ID)
        const leftoversRes = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${kitchenStorageId}`);
        const leftoversData = await leftoversRes.json();
        if (leftoversData.error) throw new Error(`Poster API error (getStorageLeftovers): ${leftoversData.error.message}`);

        const leftovers = leftoversData.response || [];
        console.log(`✅ [${tenantId}] Loaded ${leftovers.length} KITCHEN leftovers from Poster (storage_id: ${kitchenStorageId}).`);

        // 3. Extract unique categories and save them to our database
        const uniqueCategories = new Map();
        allIngredients.forEach(ing => {
            if (ing.category_id && ing.category_name) {
                uniqueCategories.set(ing.category_id, ing.category_name);
            }
        });
        await saveCategoriesToDb(uniqueCategories, tenantId);

        // Unit translation map
        const unitTranslation = {
            'pcs': 'шт', 'pc': 'шт', 'штук': 'шт', 'kg': 'кг', 'килограмм': 'кг', 'g': 'г', 'грамм': 'г',
            'l': 'л', 'литр': 'л', 'ml': 'мл', 'миллилитр': 'мл', 'bottle': 'бут', 'бутылка': 'бут',
            'pack': 'упак', 'упаковка': 'упак', 'can': 'банка', 'box': 'коробка'
        };

        // 4. Combine leftovers with ingredient details
        const kitchenProducts = leftovers.map(leftover => {
            const detail = ingredientMap.get(leftover.ingredient_id);
            const originalUnit = leftover.ingredient_unit || 'шт';
            const translatedUnit = unitTranslation[originalUnit.toLowerCase()] || originalUnit;
            
            return {
                id: parseInt(leftover.ingredient_id),
                name: leftover.ingredient_name,
                quantity: parseFloat(leftover.storage_ingredient_left) || 0,
                unit: translatedUnit,
                minQuantity: 1,
                poster_category_id: detail ? parseInt(detail.category_id) : null,
                poster_category_name: detail ? detail.category_name : null,
            };
        });
        
        // 5. Enrich with our database categories
        const { client: dbClient, error: dbError } = await getDbClient();
        if (!dbError && dbClient) {
            try {
                // Get category assignments from our database (tenant-specific)
                const productIds = kitchenProducts.map(p => p.id);
                const query = `
                    SELECT p.id, p.category_id, pc.name as category_name
                    FROM products p
                    LEFT JOIN product_categories pc ON p.category_id = pc.id
                    WHERE p.id = ANY($1) AND p.restaurant_id = $2
                `;
                const result = await dbClient.query(query, [productIds, tenantId]);
                
                // Create a map of product_id -> category info
                const categoryMap = new Map(
                    result.rows.map(row => [row.id, { category_id: row.category_id, category_name: row.category_name }])
                );
                
                // Enrich products with database categories
                kitchenProducts.forEach(product => {
                    const dbCategory = categoryMap.get(product.id);
                    if (dbCategory) {
                        product.category_id = dbCategory.category_id;
                        product.category_name = dbCategory.category_name || 'Без категории';
                    } else {
                        product.category_id = null;
                        product.category_name = 'Без категории';
                    }
                });
                
                console.log(`✅ [${tenantId}] Enriched ${result.rows.length} products with database categories`);
            } catch (error) {
                console.error(`⚠️ [${tenantId}] Error enriching with database categories:`, error);
                // Fallback: just use null categories
                kitchenProducts.forEach(product => {
                    product.category_id = null;
                    product.category_name = 'Без категории';
                });
            } finally {
                safeRelease(dbClient);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            data: kitchenProducts,
            storage: { id: kitchenStorageId, name: 'кухня', itemCount: kitchenProducts.length },
            tenant: tenantId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`❌ [${tenantId}] Failed to fetch KITCHEN leftovers:`, error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            data: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}