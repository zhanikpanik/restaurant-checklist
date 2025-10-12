import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId, getPosterConfig } from "../../lib/tenant-manager.js";

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
    console.log(`📡 Poster config:`, { baseUrl, hasToken: !!token, tenantId });

    // Fetch all storages from Poster
    const storagesUrl = `${baseUrl}/storage.getStorages?token=${token}`;
    console.log(
      `📡 Fetching storages from:`,
      storagesUrl.replace(token, "TOKEN"),
    );

    const storagesResponse = await fetch(storagesUrl);
    const storagesData = await storagesResponse.json();

    console.log(
      `📦 Poster response:`,
      JSON.stringify(storagesData).substring(0, 500),
    );

    if (storagesData.error) {
      const errorMsg =
        typeof storagesData.error === "object"
          ? JSON.stringify(storagesData.error)
          : storagesData.error;
      console.error(`❌ Poster API error:`, errorMsg);
      throw new Error(`Poster API error: ${errorMsg}`);
    }

    const storages = storagesData.response || [];
    console.log(`✅ Found ${storages.length} storages in Poster`);

    await client.query("BEGIN");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const storage of storages) {
      const emoji = getEmojiForStorage(storage.storage_name);

      try {
        // Use INSERT ... ON CONFLICT to handle duplicates gracefully
        // ON CONFLICT uses (restaurant_id, poster_storage_id) composite key
        const result = await client.query(
          `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (restaurant_id, poster_storage_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             emoji = EXCLUDED.emoji,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [tenantId, storage.storage_name, emoji, storage.storage_id],
        );

        if (result.rows[0].inserted) {
          console.log(
            `✅ Created section: ${storage.storage_name} (storage_id: ${storage.storage_id})`,
          );
          created++;
        } else {
          console.log(
            `🔄 Updated section: ${storage.storage_name} (storage_id: ${storage.storage_id})`,
          );
          updated++;
        }
      } catch (err) {
        console.error(
          `⚠️ Error syncing section ${storage.storage_name}:`,
          err.message,
        );
        skipped++;
      }
    }

    await client.query("COMMIT");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced sections from Poster: ${created} created, ${updated} updated, ${skipped} skipped`,
        data: {
          created,
          updated,
          skipped,
          total: storages.length,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ [${tenantId}] Error syncing sections:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    safeRelease(client);
  }
}

// Helper function to assign emoji based on storage name
function getEmojiForStorage(storageName) {
  const name = storageName.toLowerCase();

  if (name.includes("кухн") || name.includes("kitchen")) return "🍳";
  if (name.includes("бар") || name.includes("bar")) return "🍷";
  if (
    name.includes("склад") ||
    name.includes("storage") ||
    name.includes("warehouse")
  )
    return "📦";
  if (name.includes("офис") || name.includes("office")) return "🏢";
  if (name.includes("горничн") || name.includes("housekeeping")) return "🧹";
  if (name.includes("ресепшн") || name.includes("reception")) return "🔔";

  return "📍"; // Default emoji
}
