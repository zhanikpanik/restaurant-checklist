import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Sync products (ingredients) to sections based on Poster leftovers
 * GET /api/sync-section-products?section_id=123 (optional, syncs all sections if not provided)
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const url = new URL(request.url);
        const sectionIdParam = url.searchParams.get('section_id');

        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        console.log(`🔄 [${tenantId}] Syncing products to sections...`);

        // Get sections to sync
        let sectionsQuery;
        let sectionsParams;

        if (sectionIdParam) {
            sectionsQuery = `
                SELECT id, name, poster_storage_id
                FROM sections
                WHERE id = $1 AND restaurant_id = $2 AND is_active = true AND poster_storage_id IS NOT NULL
            `;
            sectionsParams = [sectionIdParam, tenantId];
        } else {
            sectionsQuery = `
                SELECT id, name, poster_storage_id
                FROM sections
                WHERE restaurant_id = $1 AND is_active = true AND poster_storage_id IS NOT NULL
            `;
            sectionsParams = [tenantId];
        }

        const sectionsResult = await client.query(sectionsQuery, sectionsParams);
        const sections = sectionsResult.rows;

        if (sections.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No sections found to sync'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📦 Found ${sections.length} sections to sync`);

        // Fetch all ingredients from Poster once
        const ingredientsUrl = `${baseUrl}/menu.getIngredients?token=${token}`;
        console.log(`📡 Fetching ingredients from Poster...`);

        const ingredientsResponse = await fetch(ingredientsUrl);
        const ingredientsData = await ingredientsResponse.json();

        if (ingredientsData.error) {
            throw new Error(`Poster API error: ${ingredientsData.error.message || JSON.stringify(ingredientsData.error)}`);
        }

        const allIngredients = ingredientsData.response || [];
        console.log(`✅ Fetched ${allIngredients.length} ingredients from Poster`);

        // Create ingredient map for quick lookup
        const ingredientMap = {};
        allIngredients.forEach(ing => {
            ingredientMap[ing.ingredient_id] = {
                id: ing.ingredient_id,
                name: ing.ingredient_name,
                unit: ing.unit
            };
        });

        await client.query('BEGIN');

        let totalCreated = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;

        // Sync products for each section
        for (const section of sections) {
            console.log(`🔄 Syncing products for section: ${section.name} (storage_id: ${section.poster_storage_id})`);

            // Fetch leftovers for this storage to know which products exist
            const leftoversUrl = `${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${section.poster_storage_id}`;
            const leftoversResponse = await fetch(leftoversUrl);
            const leftoversData = await leftoversResponse.json();

            if (leftoversData.error) {
                console.warn(`⚠️ Error fetching leftovers for storage ${section.poster_storage_id}: ${leftoversData.error.message}`);
                continue;
            }

            const leftovers = leftoversData.response || [];
            const ingredientIds = [...new Set(leftovers.map(l => l.ingredient_id))];

            console.log(`📦 Found ${ingredientIds.length} unique ingredients in storage ${section.poster_storage_id}`);

            // Sync each ingredient as a product
            for (const ingredientId of ingredientIds) {
                const ingredient = ingredientMap[ingredientId];
                if (!ingredient) {
                    console.warn(`⚠️ Ingredient ${ingredientId} not found in ingredients list`);
                    continue;
                }

                // Check if product already exists
                const existingProduct = await client.query(
                    `SELECT id, name, unit FROM section_products
                     WHERE section_id = $1 AND poster_ingredient_id = $2`,
                    [section.id, ingredientId]
                );

                if (existingProduct.rows.length === 0) {
                    // Create new product
                    await client.query(
                        `INSERT INTO section_products (section_id, poster_ingredient_id, name, unit, is_active)
                         VALUES ($1, $2, $3, $4, true)`,
                        [section.id, ingredientId, ingredient.name, ingredient.unit]
                    );
                    totalCreated++;
                } else if (
                    existingProduct.rows[0].name !== ingredient.name ||
                    existingProduct.rows[0].unit !== ingredient.unit
                ) {
                    // Update product if changed
                    await client.query(
                        `UPDATE section_products
                         SET name = $1, unit = $2, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $3`,
                        [ingredient.name, ingredient.unit, existingProduct.rows[0].id]
                    );
                    totalUpdated++;
                } else {
                    totalSkipped++;
                }
            }
        }

        await client.query('COMMIT');

        console.log(`✅ [${tenantId}] Products sync complete: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`);

        return new Response(JSON.stringify({
            success: true,
            message: `Synced products: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`,
            data: {
                created: totalCreated,
                updated: totalUpdated,
                skipped: totalSkipped,
                sections_synced: sections.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error syncing section products:`, error);
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
