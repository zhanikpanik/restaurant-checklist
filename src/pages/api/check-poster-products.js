import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

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

    // Check section_products table for products with poster_ingredient_id
    const result = await client.query(
      `SELECT sp.id, sp.name, sp.poster_ingredient_id, sp.unit, sp.leftover_quantity,
              s.name as section_name, s.poster_storage_id
       FROM section_products sp
       JOIN sections s ON sp.section_id = s.id
       WHERE s.restaurant_id = $1
       ORDER BY sp.poster_ingredient_id IS NOT NULL DESC, sp.name ASC
       LIMIT 50`,
      [tenantId],
    );

    const productsWithPoster = result.rows.filter(
      (p) => p.poster_ingredient_id,
    );
    const productsWithoutPoster = result.rows.filter(
      (p) => !p.poster_ingredient_id,
    );

    return new Response(
      JSON.stringify({
        success: true,
        tenantId: tenantId,
        totalProducts: result.rows.length,
        productsWithPosterIds: productsWithPoster.length,
        productsWithoutPosterIds: productsWithoutPoster.length,
        samplePosterProducts: productsWithPoster.slice(0, 10),
        sampleCustomProducts: productsWithoutPoster.slice(0, 10),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Error checking products:", err);
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
