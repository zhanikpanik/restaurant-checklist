import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant.js";

export const prerender = false;

export async function GET({ request }) {
  const { client, error } = await getDbClient();

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Database connection failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const tenantId = getTenantId(request);

    // Get all suppliers
    const allSuppliers = await client.query(
      "SELECT id, restaurant_id, name, poster_supplier_id, created_at FROM suppliers ORDER BY created_at DESC LIMIT 20",
    );

    // Get suppliers for this tenant
    const tenantSuppliers = await client.query(
      "SELECT id, restaurant_id, name, poster_supplier_id, created_at FROM suppliers WHERE restaurant_id = $1 ORDER BY created_at DESC",
      [tenantId],
    );

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          currentTenantId: tenantId,
          requestUrl: request.url,
          allSuppliersCount: allSuppliers.rows.length,
          tenantSuppliersCount: tenantSuppliers.rows.length,
          allSuppliers: allSuppliers.rows,
          tenantSuppliers: tenantSuppliers.rows,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Debug error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    safeRelease(client);
  }
}
