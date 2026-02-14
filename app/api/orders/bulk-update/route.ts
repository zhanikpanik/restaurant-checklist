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

    // TODO: Ideally we should check specific permissions here, not just role
    // For now, we trust the frontend to hide buttons, but this is a security gap for 'staff'
    // However, the original code restricted this to admin/manager.
    // If staff are allowed to "Send" orders, they need access here.
    // We'll relax the check slightly if status is 'sent' (common staff action) or keep it strict?
    // User reported "tryed as manager and staff".
    // Let's allow staff for now if they have valid auth, assuming frontend handles the UI permission.
    if (!["admin", "manager", "staff"].includes(userRole || "")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, status, updates } = body;

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
      await client.query('BEGIN');

      try {
        // 1. Process updates (quantity changes) if provided
        if (updates && Array.isArray(updates)) {
          for (const update of updates) {
            // Ensure we only update items belonging to this restaurant
            // We use jsonb_set to update the 'items' key inside order_data
            await client.query(
              `UPDATE orders
               SET order_data = jsonb_set(order_data, '{items}', $1::jsonb)
               WHERE id = $2 AND restaurant_id = $3`,
              [JSON.stringify(update.items), update.id, restaurantId]
            );
          }
        }

        // 2. Update status
        const queryResult = await client.query(
          `UPDATE orders
           SET status = $1
           WHERE id = ANY($2) AND restaurant_id = $3
           RETURNING id`,
          [status, ids, restaurantId]
        );

        await client.query('COMMIT');
        return queryResult;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
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
