import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { restaurantId } = auth;

    const body = await request.json();
    const { items, missingItemsAction } = body; 
    // missingItemsAction: 'transit' | 'pending' | 'cancel'

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Items array is required" }, { status: 400 });
    }

    // Group items by their original order ID
    const itemsByOrder: Record<number, any[]> = {};
    items.forEach(item => {
      if (!itemsByOrder[item._orderId]) itemsByOrder[item._orderId] = [];
      itemsByOrder[item._orderId].push(item);
    });

    const result = await withTenant(restaurantId, async (client) => {
      await client.query('BEGIN');

      try {
        for (const [orderIdStr, updatedItems] of Object.entries(itemsByOrder)) {
          const orderId = parseInt(orderIdStr);
          
          // Fetch current order data
          const currentOrderRes = await client.query(
            "SELECT order_data, created_by_role FROM orders WHERE id = $1 AND restaurant_id = $2",
            [orderId, restaurantId]
          );
          
          if (currentOrderRes.rowCount === 0) continue;
          const currentOrder = currentOrderRes.rows[0];
          const originalItems = currentOrder.order_data.items || [];
          
          // Identify delivered vs missing items for this order
          const deliveredItems: any[] = [];
          const missingItems: any[] = [];
          
          originalItems.forEach((origItem: any, idx: number) => {
            const update = updatedItems.find(u => u._itemIdx === idx);
            if (update) {
              const receivedQty = update.receivedQty !== undefined ? update.receivedQty : origItem.quantity;
              const receivedPrice = update.receivedPrice !== undefined ? update.receivedPrice : origItem.price;
              
              if (receivedQty > 0) {
                deliveredItems.push({ ...origItem, quantity: receivedQty, price: receivedPrice });
              }
              
              // If we received less than ordered, the "remainder" is missing
              const remainderQty = origItem.quantity - receivedQty;
              if (remainderQty > 0) {
                missingItems.push({ ...origItem, quantity: remainderQty });
              }
            } else {
              // Item wasn't in the update list (shouldn't happen with current UI but for safety)
              missingItems.push(origItem);
            }
          });

          // 1. Handle delivered items: Create a NEW delivered order if there are any
          if (deliveredItems.length > 0) {
            const deliveredOrderData = {
              ...currentOrder.order_data,
              items: deliveredItems,
              total_items: deliveredItems.length
            };
            
            await client.query(
              `INSERT INTO orders (restaurant_id, order_data, status, created_by_role, delivered_at) 
               VALUES ($1, $2, 'delivered', $3, NOW())`,
              [restaurantId, JSON.stringify(deliveredOrderData), currentOrder.created_by_role]
            );
          }

          // 2. Handle missing items: Update original order or delete if nothing left
          if (missingItems.length > 0) {
            let newStatus = 'sent'; // 'transit' -> stays 'sent'
            if (missingItemsAction === 'pending') newStatus = 'pending';
            if (missingItemsAction === 'cancel') newStatus = 'cancelled';
            
            const missingOrderData = {
              ...currentOrder.order_data,
              items: missingItems,
              total_items: missingItems.length
            };

            await client.query(
              `UPDATE orders 
               SET order_data = $1, status = $2, updated_at = NOW() 
               WHERE id = $3 AND restaurant_id = $4`,
              [JSON.stringify(missingOrderData), newStatus, orderId, restaurantId]
            );
          } else {
            // All items were delivered, delete the original "sent" order record 
            // to keep the list clean (it's replaced by the new 'delivered' one)
            await client.query(
              "DELETE FROM orders WHERE id = $1 AND restaurant_id = $2",
              [orderId, restaurantId]
            );
          }
        }

        await client.query('COMMIT');
        return { success: true };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });

    return NextResponse.json<ApiResponse>(result);
  } catch (error) {
    console.error("Error receiving delivery:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
