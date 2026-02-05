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
    const userId = parseInt(session.user.id);
    const restaurantId = session.user.restaurantId;

    // Check permission: only admin/manager OR users with can_receive_supplies permission
    let hasPermission = ["admin", "manager"].includes(userRole);
    
    if (!hasPermission) {
      // Check if user has can_receive_supplies permission in any section
      const permissions = await withTenant(restaurantId, async (client) => {
        const result = await client.query(
          `SELECT 1 FROM user_sections us
           JOIN sections s ON s.id = us.section_id
           WHERE us.user_id = $1 AND s.restaurant_id = $2 AND us.can_receive_supplies = true
           LIMIT 1`,
          [userId, restaurantId]
        );
        return result.rows.length > 0;
      });
      hasPermission = permissions;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to create supply orders" },
        { status: 403 }
      );
    }

    // Get restaurant's Poster token
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant?.poster_token) {
      return NextResponse.json(
        { success: false, error: "Poster integration not configured for this restaurant" },
        { status: 400 }
      );
    }

    // Create a PosterAPI instance with this restaurant's token
    const posterAPI = new PosterAPI(restaurant.poster_token);

    const body = await request.json();
    const { supplier_id, storage_id, items, comment } = body;

    if (!supplier_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "supplier_id and items are required" },
        { status: 400 }
      );
    }

    // Create supply order in Poster
    const result = await posterAPI.createSupplyOrder({
      supplier_id: Number(supplier_id),
      storage_id: Number(storage_id) || 1, // Default storage if not provided
      ingredients: items.map((item: any) => ({
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        price: item.price || 0,
      })),
      comment: comment || "Заказ из приложения",
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Supply order sent to Poster successfully",
    });
  } catch (error) {
    console.error("Error creating Poster supply order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
