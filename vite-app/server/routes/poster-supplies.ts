import { Router, Response } from 'express';
import { withTenant, withoutTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { PosterAPI } from '../lib/poster-api';

const router = Router();

/**
 * POST /api/poster-supplies
 * Create supplies in Poster from delivered order
 */
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { orderId, storage_id } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required',
      });
    }

    // Get restaurant's Poster token
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        'SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1',
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant?.poster_token) {
      return res.status(400).json({
        success: false,
        error: 'Poster integration not configured',
      });
    }

    // Get order details
    const order = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2',
        [orderId, restaurantId]
      );
      return result.rows[0];
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Group items by supplier
    const itemsBySupplier = new Map<number, any[]>();
    
    for (const item of order.order_data.items) {
      // Skip if no supplier_id
      if (!item.supplier_id) {
        console.log(`Item ${item.name} has no supplier_id, skipping`);
        continue;
      }

      if (!itemsBySupplier.has(item.supplier_id)) {
        itemsBySupplier.set(item.supplier_id, []);
      }
      itemsBySupplier.get(item.supplier_id)!.push(item);
    }

    const results: any[] = [];
    const posterAPI = new PosterAPI(restaurant.poster_token);

    // Process each supplier group
    for (const [supplierIdLocal, items] of itemsBySupplier.entries()) {
      // Get supplier with poster_supplier_id
      const supplier = await withTenant(restaurantId, async (client) => {
        const result = await client.query(
          'SELECT id, name, poster_supplier_id FROM suppliers WHERE id = $1 AND restaurant_id = $2',
          [supplierIdLocal, restaurantId]
        );
        return result.rows[0];
      });

      // Check if supplier is linked to Poster
      if (!supplier || !supplier.poster_supplier_id) {
        console.log(`Supplier ${supplierIdLocal} (${supplier?.name || 'unknown'}) not linked to Poster`);
        results.push({
          success: true,
          message: `Supplier not linked to Poster - skipped`,
          skipped: true,
          supplier_id: supplierIdLocal,
          supplier_name: supplier?.name || 'Unknown',
        });
        continue;
      }

      // Prepare ingredients for Poster
      const ingredients = items
        .filter((item) => item.poster_id) // Only items with poster_id
        .map((item) => ({
          ingredient_id: item.poster_id,
          quantity: parseFloat(item.quantity || item.actualQuantity || 0),
          price: parseFloat(item.actualPrice || 0),
        }));

      if (ingredients.length === 0) {
        console.log(`No valid ingredients for supplier ${supplier.name}`);
        results.push({
          success: true,
          message: 'No Poster ingredients found - skipped',
          skipped: true,
          supplier_id: supplierIdLocal,
          supplier_name: supplier.name,
        });
        continue;
      }

      // Create supply in Poster
      try {
        const supplyResult = await posterAPI.createSupplyOrder({
          supplier_id: Number(supplier.poster_supplier_id),
          storage_id: storage_id || 1, // Default storage if not provided
          ingredients,
          comment: `Приёмка от ${order.order_data.department || 'Закупка'}`,
        });

        results.push({
          success: true,
          supplier_id: supplierIdLocal,
          supplier_name: supplier.name,
          poster_result: supplyResult,
          items_count: ingredients.length,
        });

        console.log(`✓ Created supply for supplier ${supplier.name} (${ingredients.length} items)`);
      } catch (error) {
        console.error(`Error creating supply for supplier ${supplier.name}:`, error);
        results.push({
          success: false,
          supplier_id: supplierIdLocal,
          supplier_name: supplier.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        order_id: orderId,
        results,
        total_suppliers: itemsBySupplier.size,
        succeeded: results.filter((r) => r.success && !r.skipped).length,
        skipped: results.filter((r) => r.skipped).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error('Error creating Poster supplies:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
