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
      for (const posterSupplier of posterSuppliers) {
        const supplierId = parseInt(posterSupplier.supplier_id);
        const supplierName =
          posterSupplier.supplier_name || `Supplier #${supplierId}`;
        const phone = posterSupplier.supplier_phone || null;
        const contactInfo = posterSupplier.supplier_adress || null; // Note: Poster has typo "adress"

        // Use INSERT ... ON CONFLICT to handle duplicates gracefully
        // ON CONFLICT uses (restaurant_id, poster_supplier_id) composite key
        const result = await client.query(
          `INSERT INTO suppliers (restaurant_id, name, phone, contact_info, poster_supplier_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (restaurant_id, poster_supplier_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             contact_info = EXCLUDED.contact_info,
             updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [tenantId, supplierName, phone, contactInfo, supplierId],
        );

        if (result.rows[0].inserted) {
          console.log(
            `✅ Created supplier: ${supplierName} (ID: ${supplierId})`,
          );
          created++;
        } else {
          console.log(
            `🔄 Updated supplier: ${supplierName} (ID: ${supplierId})`,
          );
          updated++;
        }
      }

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
