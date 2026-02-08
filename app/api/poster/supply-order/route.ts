import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withoutTenant, withTenant } from "@/lib/db";
import { PosterAPI } from "@/lib/poster-api";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = session.user.role || "staff";
    const restaurantId = session.user.restaurantId;

    // Check permission: only admin/manager can create supplies
    if (!["admin", "manager"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can create supply orders" },
        { status: 403 }
      );
    }

    // Get restaurant's Poster token
    let restaurant;
    try {
      restaurant = await withoutTenant(async (client) => {
        const result = await client.query(
          "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
          [restaurantId]
        );
        return result.rows[0];
      });
      
      console.log("Restaurant data:", {
        id: restaurantId,
        hasToken: !!restaurant?.poster_token,
        tokenLength: restaurant?.poster_token?.length,
        tokenPreview: restaurant?.poster_token?.substring(0, 10) + "...",
        accountName: restaurant?.poster_account_name
      });
      
    } catch (dbError) {
      console.error("Database error fetching restaurant:", dbError);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    if (!restaurant?.poster_token) {
      console.log("Poster not configured for restaurant:", restaurantId);
      return NextResponse.json({
        success: true,
        message: "Poster not configured - skipped",
        skipped: true,
      });
    }

    const body = await request.json();
    const { supplier_id, storage_id, items, comment } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No items to send to Poster",
        skipped: true,
      });
    }

    // Filter out items without valid ingredient_id
    const validItems = items.filter(item => 
      item.ingredient_id && item.ingredient_id !== "undefined" && item.ingredient_id !== "null"
    );

    if (validItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No valid Poster items found",
        skipped: true,
      });
    }

    // Look up poster_supplier_id from local supplier
    let posterSupplierId: number | null = null;
    if (supplier_id) {
      try {
        const supplierResult = await withTenant(restaurantId, async (client) => {
          const result = await client.query(
            "SELECT poster_supplier_id FROM suppliers WHERE id = $1 AND restaurant_id = $2",
            [supplier_id, restaurantId]
          );
          return result.rows[0];
        });
        posterSupplierId = supplierResult?.poster_supplier_id || null;
        console.log("Local supplier_id:", supplier_id, "-> Poster supplier_id:", posterSupplierId);
      } catch (err) {
        console.error("Error looking up supplier:", err);
      }
    }

    if (!posterSupplierId) {
      return NextResponse.json({
        success: true,
        message: "Supplier not linked to Poster - skipped",
        skipped: true,
      });
    }

    // Create a PosterAPI instance with this restaurant's token
    const posterAPI = new PosterAPI(restaurant.poster_token);

    const supplyData = {
      supplier_id: posterSupplierId,
      storage_id: Number(storage_id) || 1,
      ingredients: validItems.map((item: any) => ({
        ingredient_id: String(item.ingredient_id),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      })),
      comment: comment || "Заказ из приложения",
    };
    
    console.log("Sending to Poster:", JSON.stringify(supplyData, null, 2));

    try {
      // Create supply order in Poster
      const result = await posterAPI.createSupplyOrder(supplyData);

      console.log("Poster supply order created:", result);

      return NextResponse.json({
        success: true,
        data: result,
        message: "Supply order sent to Poster successfully",
      });
    } catch (posterError) {
      console.error("Poster API error:", posterError);
      // Return success but with warning - don't block the delivery
      return NextResponse.json({
        success: true,
        message: `Poster API error: ${posterError instanceof Error ? posterError.message : "Unknown"}`,
        warning: true,
      });
    }
  } catch (error) {
    console.error("Error in supply-order route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
