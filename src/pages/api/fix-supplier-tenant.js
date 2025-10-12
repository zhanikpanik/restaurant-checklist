import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * POST: Fix supplier tenant IDs - move suppliers to current tenant
 */
export async function POST({ request }) {
  try {
    const tenantId = getTenantId(request);
    console.log("🔧 Fixing suppliers for tenant:", tenantId);

    const { client, error } = await getDbClient();
    if (error) {
      throw new Error("Database connection failed");
    }

    try {
      // Update all suppliers with poster_supplier_id to the current tenant
      const result = await client.query(
        `UPDATE suppliers
         SET restaurant_id = $1
         WHERE poster_supplier_id IS NOT NULL
         AND restaurant_id != $1
         RETURNING id, name, poster_supplier_id, restaurant_id`,
        [tenantId],
      );

      console.log(`✅ Fixed ${result.rows.length} suppliers`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Fixed ${result.rows.length} suppliers to tenant ${tenantId}`,
          data: result.rows,
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
    console.error("❌ Failed to fix suppliers:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to fix suppliers",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
