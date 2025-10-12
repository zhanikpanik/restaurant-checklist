import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * GET: Fetch Poster storages (warehouses) for supply creation
 * Returns list of storages from Poster API
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

    console.log("📦 Fetching Poster storages...");

    // Fetch storages from Poster API
    const posterApiUrl = "https://joinposter.com/api/storage.getStorages";
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

    // Format storages for dropdown
    const storages = data.response || [];
    console.log(`✅ Fetched ${storages.length} storages from Poster`);

    return new Response(
      JSON.stringify({
        success: true,
        data: storages.map((storage) => ({
          id: parseInt(storage.storage_id),
          name: storage.storage_name || `Склад #${storage.storage_id}`,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Failed to fetch Poster storages:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to fetch storages",
        data: [],
      }),
      {
        status: 200, // Return 200 to allow graceful degradation
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
