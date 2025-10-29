import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
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
    const { restaurantId } = auth;

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<Order>(
      `SELECT * FROM orders
       WHERE restaurant_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [restaurantId]
    );

    return NextResponse.json<ApiResponse<Order[]>>({
      success: true,
      data: result.rows,
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
    const { restaurantId } = auth;

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

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
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

    // Save order to database
    const result = await pool.query<Order>(
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

    console.log(`✅ Order created with ID: ${result.rows[0].id}`);

    return NextResponse.json<ApiResponse<Order>>({
      success: true,
      data: result.rows[0],
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
    const { restaurantId } = auth;

    const body = await request.json();
    const { id, status, order_data } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<Order>(
      `UPDATE orders
       SET status = COALESCE($1, status),
           order_data = COALESCE($2, order_data),
           delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
       WHERE id = $3 AND restaurant_id = $4
       RETURNING *`,
      [status, order_data ? JSON.stringify(order_data) : null, id, restaurantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Order>>({
      success: true,
      data: result.rows[0],
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

// DELETE /api/orders - Delete order
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `DELETE FROM orders
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [orderId, restaurantId]
    );

    if (result.rowCount === 0) {
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