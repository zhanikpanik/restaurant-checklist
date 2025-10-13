import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Combined Inventory API
 * Returns products for a specific section (department name)
 * Combines section_products and custom_products
 */
export async function GET({ request, url }) {
  const tenantId = getTenantId(request);
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    const searchParams = new URL(url).searchParams;
    const departmentName = searchParams.get("department");
    const sectionIdParam = searchParams.get("section_id");

    if (!departmentName && !sectionIdParam) {
      throw new Error("Department name or section_id parameter is required");
    }

    console.log(
      `📦 Loading inventory for section: "${departmentName || `ID:${sectionIdParam}`}"`,
    );

    // Find the section by ID or name
    let sectionResult;
    if (sectionIdParam) {
      sectionResult = await client.query(
        `SELECT id, name, emoji, poster_storage_id
               FROM sections
               WHERE restaurant_id = $1 AND id = $2 AND is_active = true
               LIMIT 1`,
        [tenantId, sectionIdParam],
      );
    } else {
      sectionResult = await client.query(
        `SELECT id, name, emoji, poster_storage_id
               FROM sections
               WHERE restaurant_id = $1 AND name = $2 AND is_active = true
               LIMIT 1`,
        [tenantId, departmentName],
      );
    }

    if (sectionResult.rows.length === 0) {
      console.log(
        `⚠️ Section "${departmentName || `ID:${sectionIdParam}`}" not found, returning empty array`,
      );
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const section = sectionResult.rows[0];
    const sectionId = section.id;

    // Get section products (from Poster)
    const sectionProductsResult = await client.query(
      `SELECT
                sp.id,
                sp.name,
                sp.unit,
                sp.poster_ingredient_id,
                pc.name as category_name,
                'section' as source
            FROM section_products sp
            LEFT JOIN product_categories pc ON sp.category_id = pc.id
            WHERE sp.section_id = $1 AND sp.is_active = true
            ORDER BY sp.name ASC`,
      [sectionId],
    );

    // Get custom products for this section
    console.log(
      `🔍 Querying custom products for section_id: ${sectionId}, tenant: ${tenantId}`,
    );
    const customProductsResult = await client.query(
      `SELECT
                cp.id,
                cp.name,
                cp.unit,
                cp.min_quantity,
                cp.current_quantity,
                pc.name as category_name,
                'custom' as source
            FROM custom_products cp
            LEFT JOIN product_categories pc ON cp.category_id = pc.id
            WHERE cp.restaurant_id = $1 AND cp.section_id = $2 AND cp.is_active = true
            ORDER BY cp.name ASC`,
      [tenantId, sectionId],
    );
    console.log(`📦 Found ${customProductsResult.rows.length} custom products`);

    // Combine both sets of products
    const allProducts = [
      ...sectionProductsResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || "шт",
        quantity: 0,
        minQuantity: 1,
        category_name: p.category_name,
        poster_ingredient_id: p.poster_ingredient_id, // Include for Poster supply creation
        source: "section",
      })),
      ...customProductsResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || "шт",
        quantity: p.current_quantity || 0,
        minQuantity: p.min_quantity || 1,
        category_name: p.category_name,
        source: "custom",
      })),
    ];

    console.log(
      `✅ Loaded ${allProducts.length} products (${sectionProductsResult.rows.length} section + ${customProductsResult.rows.length} custom)`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: allProducts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error loading combined inventory:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: [],
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
