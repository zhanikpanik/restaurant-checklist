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

    // Fetch suppliers from Poster API
    const posterApiUrl = "https://joinposter.com/api/storage.getSuppliers";
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
    let skipped = 0;

    try {
      for (const posterSupplier of posterSuppliers) {
        const supplierId = parseInt(posterSupplier.supplier_id);
        const supplierName =
          posterSupplier.supplier_name || `Supplier #${supplierId}`;
        const phone = posterSupplier.supplier_phone || null;
        const contactInfo = posterSupplier.supplier_adress || null; // Note: Poster has typo "adress"

        // Check if supplier already exists with this poster_supplier_id
        const existingResult = await client.query(
          "SELECT id, name FROM suppliers WHERE restaurant_id = $1 AND poster_supplier_id = $2",
          [tenantId, supplierId],
        );

        if (existingResult.rows.length > 0) {
          // Update existing supplier
          await client.query(
            `UPDATE suppliers
                         SET name = $1, phone = $2, contact_info = $3, updated_at = CURRENT_TIMESTAMP
                         WHERE restaurant_id = $4 AND poster_supplier_id = $5`,
            [supplierName, phone, contactInfo, tenantId, supplierId],
          );
          console.log(
            `✅ Updated supplier: ${supplierName} (ID: ${supplierId})`,
          );
          updated++;
        } else {
          // Check if supplier with same name exists (might be manually created)
          const nameCheck = await client.query(
            "SELECT id, poster_supplier_id FROM suppliers WHERE restaurant_id = $1 AND name = $2",
            [tenantId, supplierName],
          );

          if (
            nameCheck.rows.length > 0 &&
            !nameCheck.rows[0].poster_supplier_id
          ) {
            // Update the existing supplier to link with Poster
            await client.query(
              `UPDATE suppliers
                             SET poster_supplier_id = $1, phone = $2, contact_info = $3, updated_at = CURRENT_TIMESTAMP
                             WHERE restaurant_id = $4 AND id = $5`,
              [supplierId, phone, contactInfo, tenantId, nameCheck.rows[0].id],
            );
            console.log(
              `🔗 Linked existing supplier to Poster: ${supplierName} (ID: ${supplierId})`,
            );
            updated++;
          } else if (nameCheck.rows.length > 0) {
            // Already linked to different Poster supplier, skip
            console.log(
              `⏭️ Skipped: ${supplierName} (already linked to different Poster supplier)`,
            );
            skipped++;
          } else {
            // Create new supplier
            try {
              await client.query(
                `INSERT INTO suppliers (restaurant_id, name, phone, contact_info, poster_supplier_id, created_at)
                               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [tenantId, supplierName, phone, contactInfo, supplierId],
              );
              console.log(
                `➕ Created supplier: ${supplierName} (ID: ${supplierId})`,
              );
              created++;
            } catch (insertError) {
              // If duplicate key error, it means name already exists - link it instead
              if (insertError.code === "23505") {
                console.log(
                  `⚠️ Supplier "${supplierName}" already exists, trying to link...`,
                );
                const linkResult = await client.query(
                  `UPDATE suppliers
                   SET poster_supplier_id = $1, phone = $2, contact_info = $3, updated_at = CURRENT_TIMESTAMP
                   WHERE restaurant_id = $4 AND name = $5 AND poster_supplier_id IS NULL
                   RETURNING id`,
                  [supplierId, phone, contactInfo, tenantId, supplierName],
                );
                if (linkResult.rows.length > 0) {
                  console.log(
                    `🔗 Linked existing supplier to Poster: ${supplierName} (ID: ${supplierId})`,
                  );
                  updated++;
                } else {
                  console.log(
                    `⏭️ Skipped: ${supplierName} (already linked to different Poster supplier)`,
                  );
                  skipped++;
                }
              } else {
                throw insertError; // Re-throw if not a duplicate key error
              }
            }
          }
        }
      }

      console.log(
        `✅ Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${posterSuppliers.length} suppliers from Poster`,
          data: { created, updated, skipped, total: posterSuppliers.length },
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
