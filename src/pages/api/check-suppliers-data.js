import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Diagnostic endpoint to check supplier data and isolation
 */
export async function GET({ request }) {
  const tenantId = getTenantId(request);
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    // Check if restaurant_id column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
    `);

    const hasRestaurantId = columnCheck.rows.length > 0;

    // Get all suppliers (unfiltered)
    const allSuppliers = await client.query(`
      SELECT id, name, phone, restaurant_id, poster_supplier_id, created_at
      FROM suppliers
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Get suppliers for this tenant
    const tenantSuppliers = await client.query(`
      SELECT id, name, phone, restaurant_id, poster_supplier_id, created_at
      FROM suppliers
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);

    // Check for duplicate names across tenants
    const duplicateCheck = await client.query(`
      SELECT name, COUNT(DISTINCT restaurant_id) as tenant_count,
             array_agg(DISTINCT restaurant_id) as tenants
      FROM suppliers
      GROUP BY name
      HAVING COUNT(DISTINCT restaurant_id) > 1
    `);

    // Get constraints
    const constraints = await client.query(`
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'suppliers'::regclass
      ORDER BY conname
    `);

    return new Response(
      JSON.stringify({
        success: true,
        currentTenant: tenantId,
        hasRestaurantIdColumn: hasRestaurantId,
        allSuppliersCount: allSuppliers.rows.length,
        tenantSuppliersCount: tenantSuppliers.rows.length,
        allSuppliers: allSuppliers.rows,
        tenantSuppliers: tenantSuppliers.rows,
        duplicateNames: duplicateCheck.rows,
        constraints: constraints.rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking suppliers data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    safeRelease(client);
  }
}
