import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * GET: Fetch Poster suppliers for mapping
 * Returns list of suppliers from Poster API
 */
export async function GET({ request }) {
  try {
    const tenantId = getTenantId(request);
    const tenantConfig = await getRestaurantConfig(tenantId);

    // Check for poster_token (from database) or poster_access_token (from OAuth)
    const posterToken =
      tenantConfig?.poster_token || tenantConfig?.poster_access_token;

    if (!posterToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Poster not configured for this tenant",
          data: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("🏢 Fetching Poster suppliers...");

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

    // Format suppliers for dropdown
    const suppliers = data.response || [];
    console.log(`✅ Fetched ${suppliers.length} suppliers from Poster`);

    return new Response(
      JSON.stringify({
        success: true,
        data: suppliers.map((supplier) => ({
          id: parseInt(supplier.supplier_id),
          name: supplier.supplier_name || `Supplier #${supplier.supplier_id}`,
          phone: supplier.supplier_phone || null,
          address: supplier.supplier_adress || null, // Note: Poster API has typo "adress"
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Failed to fetch Poster suppliers:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to fetch suppliers",
        data: [],
      }),
      {
        status: 200, // Return 200 to allow graceful degradation
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
