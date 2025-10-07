import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Sync leftovers (inventory) for sections from Poster
 * GET /api/sync-section-leftovers?section_id=123 (optional, syncs all sections if not provided)
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

        console.log(`🔄 [${tenantId}] Syncing leftovers to sections...`);

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

        console.log(`📦 Found ${sections.length} sections to sync leftovers`);

        await client.query('BEGIN');

        let totalCreated = 0;
        let totalUpdated = 0;
        let totalZeroQuantity = 0;

        // Sync leftovers for each section
        for (const section of sections) {
            console.log(`🔄 Syncing leftovers for section: ${section.name} (storage_id: ${section.poster_storage_id})`);

            // Fetch leftovers for this storage
            const leftoversUrl = `${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${section.poster_storage_id}`;
            const leftoversResponse = await fetch(leftoversUrl);
            const leftoversData = await leftoversResponse.json();

            if (leftoversData.error) {
                console.warn(`⚠️ Error fetching leftovers for storage ${section.poster_storage_id}: ${leftoversData.error.message}`);
                continue;
            }

            const leftovers = leftoversData.response || [];
            console.log(`📦 Found ${leftovers.length} leftover entries in storage ${section.poster_storage_id}`);

            // First, set all leftovers for this section to 0 (they'll be updated if they exist in Poster)
            await client.query(
                `UPDATE section_leftovers
                 SET quantity = 0, last_synced_at = CURRENT_TIMESTAMP
                 WHERE section_id = $1`,
                [section.id]
            );

            // Process each leftover
            for (const leftover of leftovers) {
                const quantity = parseFloat(leftover.quantity) || 0;

                // Get the section_product_id for this ingredient
                const productResult = await client.query(
                    `SELECT id FROM section_products
                     WHERE section_id = $1 AND poster_ingredient_id = $2 AND is_active = true`,
                    [section.id, leftover.ingredient_id]
                );

                if (productResult.rows.length === 0) {
                    console.warn(`⚠️ Product not found for ingredient ${leftover.ingredient_id} in section ${section.id}. Run sync-section-products first.`);
                    continue;
                }

                const sectionProductId = productResult.rows[0].id;

                // Check if leftover record exists
                const existingLeftover = await client.query(
                    `SELECT id, quantity FROM section_leftovers
                     WHERE section_id = $1 AND section_product_id = $2`,
                    [section.id, sectionProductId]
                );

                if (existingLeftover.rows.length === 0) {
                    // Create new leftover record
                    await client.query(
                        `INSERT INTO section_leftovers (section_id, section_product_id, quantity, last_synced_at)
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                        [section.id, sectionProductId, quantity]
                    );
                    totalCreated++;
                } else {
                    // Update existing leftover
                    await client.query(
                        `UPDATE section_leftovers
                         SET quantity = $1, last_synced_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [quantity, existingLeftover.rows[0].id]
                    );
                    totalUpdated++;
                }

                if (quantity === 0) {
                    totalZeroQuantity++;
                }
            }
        }

        await client.query('COMMIT');

        console.log(`✅ [${tenantId}] Leftovers sync complete: ${totalCreated} created, ${totalUpdated} updated, ${totalZeroQuantity} zero quantity`);

        return new Response(JSON.stringify({
            success: true,
            message: `Synced leftovers: ${totalCreated} created, ${totalUpdated} updated`,
            data: {
                created: totalCreated,
                updated: totalUpdated,
                zero_quantity: totalZeroQuantity,
                sections_synced: sections.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error syncing section leftovers:`, error);
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
