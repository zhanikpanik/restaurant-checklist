import { Router, Response } from 'express';
import { withTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// Helper function to generate item ID
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/orders
router.get('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    const orders = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM orders
         WHERE restaurant_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [restaurantId]
      );
      return result.rows;
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/orders
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId, userId, userRole } = req as AuthenticatedRequest;
    const orderData = req.body;

    console.log('Creating new order...', orderData);

    // Validate required fields
    if (!orderData.department || !orderData.items || !Array.isArray(orderData.items)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order data: department and items array are required',
      });
    }

    // Validate items
    if (orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item',
      });
    }

    // Check section access for non-admin/manager users
    if (userId && userRole && !['admin', 'manager'].includes(userRole)) {
      const sectionId = orderData.section_id;

      if (sectionId) {
        const hasAccess = await withTenant(restaurantId, async (client) => {
          const result = await client.query(
            `SELECT 1 FROM user_sections WHERE user_id = $1 AND section_id = $2`,
            [userId, sectionId]
          );
          return result.rows.length > 0;
        });

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to create orders for this section',
          });
        }
      }
    }

    for (const item of orderData.items) {
      const qty = item.shoppingQuantity || item.quantity;
      if (!item.name || !qty || !item.unit) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have name, quantity, and unit',
        });
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
        };
      }),
      department: orderData.department,
      notes: orderData.notes || null,
      total_items: orderData.items.length,
    };

    // Save order to database with RLS
    const order = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `INSERT INTO orders (restaurant_id, order_data, status, created_by_role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          restaurantId,
          JSON.stringify(formattedOrder),
          orderData.status || 'pending',
          orderData.created_by || 'manager',
        ]
      );
      return result.rows[0];
    });

    console.log(`Order created with ID: ${order.id}`);

    res.json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/orders
router.patch('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { id, status, order_data } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
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
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/orders
router.delete('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const orderId = req.query.id as string;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
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
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
