import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Sync sections from Poster storages
 * GET /api/sync-sections
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        console.log(`🔄 [${tenantId}] Syncing sections from Poster storages...`);

        // Fetch all storages from Poster
        const storagesUrl = `${baseUrl}/storage.getStorages?token=${token}`;
        console.log(`📡 Fetching storages from Poster...`);

        const storagesResponse = await fetch(storagesUrl);
        const storagesData = await storagesResponse.json();

        if (storagesData.error) {
            throw new Error(`Poster API error: ${storagesData.error.message || JSON.stringify(storagesData.error)}`);
        }

        const storages = storagesData.response || [];
        console.log(`✅ Found ${storages.length} storages in Poster`);

        await client.query('BEGIN');

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const storage of storages) {
            // Check if section with this storage ID already exists
            const existingSection = await client.query(
                'SELECT id, name FROM sections WHERE poster_storage_id = $1 AND restaurant_id = $2',
                [storage.storage_id, tenantId]
            );

            const emoji = getEmojiForStorage(storage.storage_name);

            if (existingSection.rows.length === 0) {
                // Create new section
                await client.query(
                    `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id, is_active)
                     VALUES ($1, $2, $3, $4, true)`,
                    [tenantId, storage.storage_name, emoji, storage.storage_id]
                );

                console.log(`✅ Created section: ${storage.storage_name} (storage_id: ${storage.storage_id})`);
                created++;
            } else if (existingSection.rows[0].name !== storage.storage_name) {
                // Update section name if changed
                await client.query(
                    `UPDATE sections SET name = $1, emoji = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [storage.storage_name, emoji, existingSection.rows[0].id]
                );

                console.log(`🔄 Updated section: ${storage.storage_name}`);
                updated++;
            } else {
                console.log(`⏭️  Section already up to date: ${storage.storage_name}`);
                skipped++;
            }
        }

        await client.query('COMMIT');

        return new Response(JSON.stringify({
            success: true,
            message: `Synced sections from Poster: ${created} created, ${updated} updated, ${skipped} skipped`,
            data: {
                created,
                updated,
                skipped,
                total: storages.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error syncing sections:`, error);
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
