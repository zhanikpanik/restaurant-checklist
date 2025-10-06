import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Sync departments from Poster workshops/storages
 * GET /api/sync-departments-from-poster
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const posterConfig = await getPosterConfig(tenantId);
        const token = posterConfig.token;
        const baseUrl = posterConfig.baseUrl;

        console.log(`🔄 [${tenantId}] Syncing departments from Poster storages...`);

        // Fetch all storages from Poster
        const storagesUrl = `${baseUrl}/storage.getStorages?token=${token}`;
        console.log(`📡 Fetching storages from: ${storagesUrl.replace(token, '***')}`);

        const storagesResponse = await fetch(storagesUrl);
        const storagesData = await storagesResponse.json();

        if (storagesData.error) {
            throw new Error(`Poster API error: ${storagesData.error.message || JSON.stringify(storagesData.error)}`);
        }

        const storages = storagesData.response || [];
        console.log(`✅ Found ${storages.length} storages in Poster`);

        await client.query('BEGIN');

        let created = 0;
        let existing = 0;

        for (const storage of storages) {
            // Check if department with this storage ID already exists
            const existingDept = await client.query(
                'SELECT id FROM departments WHERE poster_storage_id = $1 AND restaurant_id = $2 AND is_active = true',
                [storage.storage_id, tenantId]
            );

            if (existingDept.rows.length === 0) {
                // Create new department
                const emoji = getEmojiForStorage(storage.storage_name);

                await client.query(
                    `INSERT INTO departments (name, emoji, poster_storage_id, is_active, restaurant_id)
                     VALUES ($1, $2, $3, true, $4)`,
                    [storage.storage_name, emoji, storage.storage_id, tenantId]
                );

                console.log(`✅ Created department: ${storage.storage_name} (storage_id: ${storage.storage_id})`);
                created++;
            } else {
                console.log(`⏭️  Department already exists: ${storage.storage_name}`);
                existing++;
            }
        }

        await client.query('COMMIT');

        return new Response(JSON.stringify({
            success: true,
            message: `Synced ${created} new departments from Poster (${existing} already existed)`,
            data: {
                created,
                existing,
                total: storages.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error syncing departments:`, error);
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
