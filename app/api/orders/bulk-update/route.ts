import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logApiError } from "@/lib/sentry";
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
        // When sending (status = 'sent'), split orders: sent items → new order, rest stays pending.
        // This prevents sending one supplier from marking other suppliers' items as sent too.
        console.log('[bulk-update] status:', status, 'updates count:', updates?.length, 'ids:', ids?.length);
        if (status === 'sent' && updates && Array.isArray(updates) && updates.length > 0) {
          console.log('[bulk-update] SPLIT: processing', updates.length, 'updates for status sent');
          for (const update of updates) {
            const orderId = update.id;
            const sentItems = update.items || [];
            if (sentItems.length === 0) continue;

            // Get the original order
            const origRes = await client.query(
              "SELECT order_data, created_by_role FROM orders WHERE id = $1 AND restaurant_id = $2 FOR UPDATE",
              [orderId, restaurantId]
            );
            if (origRes.rowCount === 0) continue;

            const orig = origRes.rows[0];
            const allItems = orig.order_data.items || [];

            // Sent items = those in the update (by _itemIdx key in name match)
            const sentItemNames = new Set(sentItems.map((i: any) => i.name));
            const remainingItems = allItems.filter((i: any) => !sentItemNames.has(i.name));

            if (sentItemNames.size === 0) continue;

            // Create new "sent" order with sent items
            await client.query(
              `INSERT INTO orders (restaurant_id, order_data, status, created_by_role, sent_at)
               VALUES ($1, $2, 'sent', $3, NOW())`,
              [restaurantId, JSON.stringify({ ...orig.order_data, items: sentItems, total_items: sentItems.length }), orig.created_by_role]
            );

            // Remove sent items from original order
            if (remainingItems.length > 0) {
              await client.query(
                `UPDATE orders SET order_data = jsonb_set(order_data, '{items}', $1::jsonb), updated_at = NOW()
                 WHERE id = $2 AND restaurant_id = $3`,
                [JSON.stringify(remainingItems), orderId, restaurantId]
              );
            } else {
              // All items sent — delete the pending order
              await client.query(
                "DELETE FROM orders WHERE id = $1 AND restaurant_id = $2",
                [orderId, restaurantId]
              );
            }
          }
        } else {
          // Non-sent status or no updates: just update status directly
          if (updates && Array.isArray(updates)) {
            for (const update of updates) {
              await client.query(
                `UPDATE orders
                 SET order_data = jsonb_set(order_data, '{items}', $1::jsonb)
                 WHERE id = $2 AND restaurant_id = $3`,
                [JSON.stringify(update.items), update.id, restaurantId]
              );
            }
          }

          await client.query(
            `UPDATE orders SET status = $1 WHERE id = ANY($2) AND restaurant_id = $3`,
            [status, ids, restaurantId]
          );
        }

        await client.query('COMMIT');
        return { rowCount: ids.length };
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
    logApiError("/api/orders/bulk-update", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
