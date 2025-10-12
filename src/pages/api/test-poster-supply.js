import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Test endpoint to directly test Poster supply creation API
 * GET /api/test-poster-supply
 */
export async function GET({ request }) {
  try {
    const tenantId = getTenantId(request);
    console.log("🧪 Testing Poster supply creation API for tenant:", tenantId);

    const tenantConfig = await getRestaurantConfig(tenantId);
    const posterToken =
      tenantConfig?.poster_token || tenantConfig?.poster_access_token;

    if (!posterToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Poster token not configured",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ Poster token found:", posterToken.substring(0, 20) + "...");

    // Correct API: storage.createSupply (for supplier deliveries!)
    const supplyData = {
      supply: {
        date: new Date().toISOString().replace("T", " ").substring(0, 19), // Y-m-d H:i:s
        supplier_id: "1", // Your "Закупка" supplier
        storage_id: "1", // Your storage
      },
      ingredient: [
        {
          id: "7", // Бумажные стаканы (poster_ingredient_id: 7)
          type: "4", // 4 = ingredient
          num: "1", // quantity
          sum: "100", // price per unit
        },
      ],
    };

    console.log("📤 Sending test request to Poster API:");
    console.log("Token:", posterToken);
    console.log("Data:", JSON.stringify(supplyData, null, 2));

    // Correct endpoint: storage.createSupply
    const posterApiUrl = `https://joinposter.com/api/storage.createSupply?token=${posterToken}`;

    const response = await fetch(posterApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplyData),
    });

    const responseData = await response.json();

    console.log("📥 Poster API response:");
    console.log(JSON.stringify(responseData, null, 2));

    if (responseData.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Poster API Error",
          posterError: responseData.error,
          posterMessage: responseData.message,
          fullResponse: responseData,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "✅ Poster supply created successfully!",
        posterResponse: responseData,
        supplyId: responseData.response,
        testData: supplyData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Test failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
