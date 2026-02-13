import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Order, OrderItem, ApiResponse } from "@/types";

// GET /api/orders - Get all orders
export async function GET(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth; // Return error response
    }
    const { restaurantId, userId, userRole } = auth;

    const { searchParams } = new URL(request.url);
    const myOrders = searchParams.get("my") === "true";
    const sectionId = searchParams.get("section_id");
    const limit = parseInt(searchParams.get("limit") || "100");

    const orders = await withTenant(restaurantId, async (client) => {
      // Check if user has send orders permission (for staff only)
      let canSendOrders = false;
      if (userId && userRole && !["admin", "manager"].includes(userRole)) {
        const permResult = await client.query(
          `SELECT EXISTS(
            SELECT 1 FROM user_sections 
            WHERE user_id = $1 AND can_send_orders = true
          ) as can_send`,
          [userId]
        );
        canSendOrders = permResult.rows[0]?.can_send || false;
      }

      // Admin/Manager always see all orders
      const isAdminOrManager = userRole && ["admin", "manager"].includes(userRole);
      
      // If filtering by specific section_id (for Last Order card)
      if (sectionId) {
        // Get section name
        const sectionResult = await client.query(
          `SELECT name FROM sections WHERE id = $1 AND restaurant_id = $2`,
          [sectionId, restaurantId]
        );
        
        if (sectionResult.rows.length === 0) {
          console.log(`Section ${sectionId} not found`);
          return [];
        }
        
        const sectionName = sectionResult.rows[0].name;
        
        // Get orders for this specific section
        const result = await client.query<Order>(
          `SELECT * FROM orders
           WHERE restaurant_id = $1
           AND order_data->>'department' = $2
           ORDER BY created_at DESC
           LIMIT $3`,
          [restaurantId, sectionName, limit]
        );
        console.log(`Returning ${result.rows.length} orders for section ${sectionName}`);
        return result.rows;
      }
      
      // If requesting "my orders" AND user is staff without send permission
      if (myOrders && !isAdminOrManager && !canSendOrders) {
        // Get user's section names
        const sectionsResult = await client.query(
          `SELECT s.name FROM sections s
           JOIN user_sections us ON us.section_id = s.id
           WHERE us.user_id = $1 AND s.restaurant_id = $2`,
          [userId, restaurantId]
        );
        const sectionNames = sectionsResult.rows.map((r: any) => r.name);

        // If user has no assigned sections, return empty
        if (sectionNames.length === 0) {
          console.log(`User ${userId} has no assigned sections, returning empty orders`);
          return [];
        }

        // Filter orders by user's departments
        const result = await client.query<Order>(
          `SELECT * FROM orders
           WHERE restaurant_id = $1
           AND order_data->>'department' = ANY($2)
           ORDER BY created_at DESC
           LIMIT $3`,
          [restaurantId, sectionNames, limit]
        );
        console.log(`Returning ${result.rows.length} orders for user ${userId} sections: ${sectionNames.join(', ')}`);
        return result.rows;
      }

      // Admin/Manager OR staff with can_send_orders = true see ALL orders
      console.log(`Returning all orders for user ${userId} (isAdmin: ${isAdminOrManager}, canSend: ${canSendOrders})`);
      const result = await client.query<Order>(
        `SELECT * FROM orders
         WHERE restaurant_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [restaurantId, limit]
      );
      return result.rows;
    });

    return NextResponse.json<ApiResponse<Order[]>>({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId, userId, userRole } = auth;

    const orderData = await request.json();
    console.log("💾 Creating new order...", orderData);

    // Validate required fields
    if (!orderData.department || !orderData.items || !Array.isArray(orderData.items)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Invalid order data: department and items array are required",
        },
        { status: 400 }
      );
    }

    // Validate items
    if (orderData.items.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Order must contain at least one item",
        },
        { status: 400 }
      );
    }

    // Check section access for non-admin/manager users
    if (userId && userRole && !["admin", "manager"].includes(userRole)) {
      // Get the section ID from section_id parameter if provided
      const sectionId = orderData.section_id;
      
      if (sectionId) {
        // Verify user has access to this section
        const hasAccess = await withTenant(restaurantId, async (client) => {
          const result = await client.query(
            `SELECT 1 FROM user_sections WHERE user_id = $1 AND section_id = $2`,
            [userId, sectionId]
          );
          return result.rows.length > 0;
        });

        if (!hasAccess) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: "You do not have access to create orders for this section",
            },
            { status: 403 }
          );
        }
      }
    }

    for (const item of orderData.items) {
      const qty = item.shoppingQuantity || item.quantity;
      if (!item.name || !qty || !item.unit) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Each item must have name, quantity, and unit",
          },
          { status: 400 }
        );
      }
    }

    // Format the order
    const formattedOrder = {
      items: orderData.items.map((item: any) => {
        const orderedQty = parseFloat(item.shoppingQuantity || item.quantity);
        return {
          id: item.id || generateItemId(),
          name: item.name,
          quantity: orderedQty,
          unit: item.unit,
          category: item.category || item.categoryName || null,
          supplier: item.supplier || null,
          supplier_id: item.supplier_id || null,
          poster_id: item.poster_id || null,
          productId: item.productId || null,
        } as OrderItem;
      }),
      department: orderData.department,
      notes: orderData.notes || null,
      total_items: orderData.items.length,
    };

    // Save order to database with RLS
    const order = await withTenant(restaurantId, async (client) => {
      const result = await client.query<Order>(
        `INSERT INTO orders (restaurant_id, order_data, status, created_by_role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          restaurantId,
          JSON.stringify(formattedOrder),
          orderData.status || "pending",
          orderData.created_by || "manager",
        ]
      );
      return result.rows[0];
    });

    console.log(`✅ Order created with ID: ${order.id}`);

    return NextResponse.json<ApiResponse<Order>>({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/orders - Update order
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId, userId, userRole } = auth;

    const body = await request.json();
    const { id, status, order_data } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Check permissions based on status transition
    const isAdminOrManager = ["admin", "manager"].includes(userRole || "");
    
    // For status updates, check specific permissions
    if (status && !isAdminOrManager && userId) {
      // Get user's permissions
      const userPermissions = await withTenant(restaurantId, async (client) => {
        const result = await client.query(
          `SELECT 
             bool_or(us.can_send_orders) as can_send,
             bool_or(us.can_receive_supplies) as can_receive
           FROM user_sections us
           JOIN sections s ON s.id = us.section_id
           WHERE us.user_id = $1 AND s.restaurant_id = $2`,
          [userId, restaurantId]
        );
        return result.rows[0] || { can_send: false, can_receive: false };
      });

      // Validate status transition permissions
      if (status === "sent" && !userPermissions.can_send) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "You don't have permission to send orders" },
          { status: 403 }
        );
      }
      if (status === "delivered" && !userPermissions.can_receive) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "You don't have permission to confirm deliveries" },
          { status: 403 }
        );
      }
      if (status === "cancelled") {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Only managers can cancel orders" },
          { status: 403 }
        );
      }
    }

    const order = await withTenant(restaurantId, async (client) => {
      const result = await client.query<Order>(
        `UPDATE orders
         SET status = COALESCE($1, status),
             order_data = COALESCE($2, order_data),
             delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND restaurant_id = $4
         RETURNING *`,
        [status, order_data ? JSON.stringify(order_data) : null, id, restaurantId]
      );
      return result.rows[0];
    });

    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Order>>({
      success: true,
      data: order,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/orders - Delete order (admin/manager only)
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId, userRole } = auth;

    // Only admin/manager can delete orders
    if (!["admin", "manager"].includes(userRole || "")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Only managers can delete orders" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const deleted = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `DELETE FROM orders
         WHERE id = $1 AND restaurant_id = $2
         RETURNING id`,
        [orderId, restaurantId]
      );
      return result.rowCount && result.rowCount > 0;
    });

    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to generate item ID
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
