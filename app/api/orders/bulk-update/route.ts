import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId, userRole } = auth;

    // Only admin and manager can bulk update orders
    if (!["admin", "manager"].includes(userRole || "")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order IDs array is required" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Status is required" },
        { status: 400 }
      );
    }

    const result = await withTenant(restaurantId, async (client) => {
      // Use ANY($1) to match any ID in the array
      const queryResult = await client.query(
        `UPDATE orders
         SET status = $1,
             delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
             sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2) AND restaurant_id = $3
         RETURNING id`,
        [status, ids, restaurantId]
      );
      return queryResult;
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${result.rowCount} orders updated successfully`,
    });
  } catch (error) {
    console.error("Error bulk updating orders:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
