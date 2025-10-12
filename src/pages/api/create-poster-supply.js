import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Create a supply in Poster when an order is completed
 * Based on Poster API: https://dev.joinposter.com/docs/v3/web/storage/createSupply
 *
 * Request body format:
 * {
 *   orderId: string,
 *   supplier_id: number,
 *   storage_id: number,
 *   supply_date: string (YYYY-MM-DD),
 *   products: [
 *     {
 *       product_id: number (from Poster),
 *       incoming_quantity: number,
 *       incoming_price: number (per unit)
 *     }
 *   ]
 * }
 */
export async function POST({ request }) {
  try {
    const tenantId = getTenantId(request);
    const tenantConfig = await getRestaurantConfig(tenantId);

    if (!tenantConfig?.poster_access_token) {
      throw new Error("Poster access token not configured for this tenant");
    }

    const { orderId, supplier_id, storage_id, supply_date, products } =
      await request.json();

    // Validation
    if (!supplier_id) {
      throw new Error("supplier_id is required");
    }

    if (!storage_id) {
      throw new Error("storage_id is required");
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new Error("products array is required and must not be empty");
    }

    // Validate each product has required fields
    for (const product of products) {
      if (!product.product_id) {
        throw new Error(
          "Each product must have a product_id (Poster product ID)",
        );
      }
      if (!product.incoming_quantity || product.incoming_quantity <= 0) {
        throw new Error("Each product must have a positive incoming_quantity");
      }
      if (product.incoming_price === undefined || product.incoming_price < 0) {
        throw new Error("Each product must have an incoming_price (can be 0)");
      }
    }

    console.log(`📦 Creating Poster supply for order ${orderId}...`);
    console.log(`   Supplier: ${supplier_id}, Storage: ${storage_id}`);
    console.log(`   Products: ${products.length} items`);

    // Prepare Poster API request
    const posterApiUrl =
      "https://joinposter.com/api/incomingOrders.createIncomingOrder";

    // Build the request body according to Poster API format
    const supplyData = {
      token: tenantConfig.poster_access_token,
      supplier_id: supplier_id,
      storage_id: storage_id,
      date: supply_date || new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    };

    // Add products to the supply
    products.forEach((product, index) => {
      supplyData[`products[${index}][product_id]`] = product.product_id;
      supplyData[`products[${index}][incoming_quantity]`] =
        product.incoming_quantity;
      supplyData[`products[${index}][incoming_price]`] = product.incoming_price;
    });

    console.log("📤 Sending request to Poster API:", posterApiUrl);
    console.log("📋 Supply data:", JSON.stringify(supplyData, null, 2));

    // Make request to Poster API
    const response = await fetch(posterApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(supplyData).toString(),
    });

    const responseData = await response.json();

    console.log(
      "📥 Poster API response:",
      JSON.stringify(responseData, null, 2),
    );

    // Check for Poster API errors
    if (responseData.error) {
      throw new Error(
        `Poster API Error: ${responseData.error} - ${responseData.message || "Unknown error"}`,
      );
    }

    // Check if response indicates success
    if (!response.ok) {
      throw new Error(`Poster API returned status ${response.status}`);
    }

    console.log(
      `✅ Supply created successfully in Poster! Supply ID: ${responseData.response?.incoming_order_id || "N/A"}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Supply created successfully in Poster",
        data: {
          poster_supply_id: responseData.response?.incoming_order_id,
          poster_response: responseData.response,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Failed to create Poster supply:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create supply in Poster",
        details: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
