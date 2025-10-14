import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";
import { getDbClient, safeRelease } from "../../lib/db-helper.js";

export const prerender = false;

/**
 * POST: Sync suppliers from Poster to local database
 * This will fetch all suppliers from Poster and create/update them locally
 */
export async function POST({ request }) {
  try {
    const tenantId = getTenantId(request);
    console.log("🔍 POST /api/sync-suppliers - tenantId:", tenantId);
    const tenantConfig = await getRestaurantConfig(tenantId);

    // Check for poster_token (from database) or poster_access_token (from OAuth)
    const posterToken =
      tenantConfig?.poster_token || tenantConfig?.poster_access_token;

    if (!posterToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Poster not configured for this tenant",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("🔄 Syncing suppliers from Poster...");

    // Fetch suppliers from Poster API using account-specific subdomain
    const accountName =
      tenantConfig?.poster_account_name || tenantConfig?.account_number;

    if (!accountName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Poster account name not configured",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const posterApiUrl = `https://${accountName}.joinposter.com/api/storage.getSuppliers`;
    console.log("📡 Fetching from:", posterApiUrl);
    const response = await fetch(`${posterApiUrl}?token=${posterToken}`);

    if (!response.ok) {
      throw new Error(`Poster API returned status ${response.status}`);
    }

    const data = await response.json();

    // Check for Poster API errors
    if (data.error) {
      throw new Error(
        `Poster API Error: ${data.error} - ${data.message || "Unknown error"}`,
      );
    }

    const posterSuppliers = data.response || [];
    console.log(`📦 Fetched ${posterSuppliers.length} suppliers from Poster`);

    if (posterSuppliers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No suppliers found in Poster",
          data: { created: 0, updated: 0, skipped: 0 },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get database connection
    const { client, error } = await getDbClient();
    if (error) {
      throw new Error("Database connection failed");
    }

    let created = 0;
    let updated = 0;

    try {
      await client.query("BEGIN");

      for (const posterSupplier of posterSuppliers) {
        const supplierId = parseInt(posterSupplier.supplier_id);
        const supplierName =
          posterSupplier.supplier_name || `Supplier #${supplierId}`;
        const phone = posterSupplier.supplier_phone || null;
        const contactInfo = posterSupplier.supplier_adress || null; // Note: Poster has typo "adress"

        try {
          // First, try to find supplier by poster_supplier_id
          const existingByPosterId = await client.query(
            `SELECT id FROM suppliers WHERE restaurant_id = $1 AND poster_supplier_id = $2`,
            [tenantId, supplierId],
          );

          if (existingByPosterId.rows.length > 0) {
            // Update existing supplier found by poster_supplier_id
            await client.query(
              `UPDATE suppliers
               SET name = $1, phone = $2, contact_info = $3, updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [supplierName, phone, contactInfo, existingByPosterId.rows[0].id],
            );
            console.log(
              `🔄 Updated supplier: ${supplierName} (ID: ${supplierId})`,
            );
            updated++;
          } else {
            // Check if supplier with same name already exists (without poster_supplier_id)
            const existingByName = await client.query(
              `SELECT id, poster_supplier_id FROM suppliers WHERE restaurant_id = $1 AND name = $2`,
              [tenantId, supplierName],
            );

            if (
              existingByName.rows.length > 0 &&
              !existingByName.rows[0].poster_supplier_id
            ) {
              // Update existing supplier with poster_supplier_id
              await client.query(
                `UPDATE suppliers
                 SET phone = $1, contact_info = $2, poster_supplier_id = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4`,
                [phone, contactInfo, supplierId, existingByName.rows[0].id],
              );
              console.log(
                `🔗 Linked existing supplier to Poster: ${supplierName} (ID: ${supplierId})`,
              );
              updated++;
            } else if (existingByName.rows.length > 0) {
              // Duplicate name but different poster_supplier_id - append ID to make unique
              const uniqueName = `${supplierName} (Poster #${supplierId})`;
              await client.query(
                `INSERT INTO suppliers (restaurant_id, name, phone, contact_info, poster_supplier_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [tenantId, uniqueName, phone, contactInfo, supplierId],
              );
              console.log(
                `✅ Created supplier with unique name: ${uniqueName}`,
              );
              created++;
            } else {
              // Create new supplier
              await client.query(
                `INSERT INTO suppliers (restaurant_id, name, phone, contact_info, poster_supplier_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [tenantId, supplierName, phone, contactInfo, supplierId],
              );
              console.log(
                `✅ Created supplier: ${supplierName} (ID: ${supplierId})`,
              );
              created++;
            }
          }
        } catch (supplierError) {
          console.error(
            `❌ Error processing supplier ${supplierName}:`,
            supplierError.message,
          );
          // Continue with next supplier instead of failing entire sync
          continue;
        }
      }

      await client.query("COMMIT");

      console.log(`✅ Sync complete: ${created} created, ${updated} updated`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${posterSuppliers.length} suppliers from Poster`,
          data: { created, updated, total: posterSuppliers.length },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (dbError) {
      await client.query("ROLLBACK");
      console.error("❌ Database error during sync:", dbError);
      throw dbError;
    } finally {
      safeRelease(client);
    }
  } catch (error) {
    console.error("❌ Failed to sync suppliers:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to sync suppliers from Poster",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
