import { Router, Response } from 'express';
import { withTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// GET /api/categories
router.get('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    const categories = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT pc.*, s.name as supplier_name
         FROM product_categories pc
         LEFT JOIN suppliers s ON pc.supplier_id = s.id
         WHERE pc.restaurant_id = $1
         ORDER BY pc.name`,
        [restaurantId]
      );
      return result.rows;
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/categories
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const categoryData = req.body;

    if (!categoryData.name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required',
      });
    }

    const category = await withTenant(restaurantId, async (client) => {
      // Check if category already exists for this restaurant
      const existingCheck = await client.query(
        `SELECT id FROM product_categories WHERE name = $1 AND restaurant_id = $2`,
        [categoryData.name, restaurantId]
      );

      if (existingCheck.rows.length > 0) {
        return null; // Category exists
      }

      // Insert new category
      const result = await client.query(
        `INSERT INTO product_categories
         (restaurant_id, name, supplier_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          restaurantId,
          categoryData.name,
          categoryData.supplier_id || null,
        ]
      );
      return result.rows[0];
    });

    if (!category) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists',
      });
    }

    res.json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/categories
router.patch('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { id, name, supplier_id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }

    const category = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE product_categories
         SET name = COALESCE($1, name),
             supplier_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND restaurant_id = $4
         RETURNING *`,
        [name, supplier_id, id, restaurantId]
      );
      return result.rows[0];
    });

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/categories
router.delete('/', requireAuth, async (req, res: Response) => {
  try {
    const categoryId = req.query.id as string;
    const { restaurantId } = req as AuthenticatedRequest;

    if (!categoryId) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }

    const result = await withTenant(restaurantId, async (client) => {
      // Check if category has associated products
      const associatedCheck = await client.query(
        `SELECT COUNT(*) as products_count
         FROM section_products sp
         JOIN product_categories pc ON sp.category_id = pc.id
         WHERE sp.category_id = $1 AND pc.restaurant_id = $2`,
        [categoryId, restaurantId]
      );

      const { products_count } = associatedCheck.rows[0];

      if (parseInt(products_count) > 0) {
        return { error: `Cannot delete category with ${products_count} products` };
      }

      const deleteResult = await client.query(
        `DELETE FROM product_categories WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
        [categoryId, restaurantId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ('error' in result) {
      return res.status(409).json({ success: false, error: result.error });
    }

    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
