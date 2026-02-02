import { Router, Response } from 'express';
import { withTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// GET /api/section-products
router.get('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    // Optional filtering by section_id and active status
    const sectionId = req.query.section_id as string | undefined;
    const activeOnly = req.query.active === 'true';

    const products = await withTenant(restaurantId, async (client) => {
      let query = `SELECT
          sp.id,
          sp.name,
          sp.unit,
          sp.poster_ingredient_id,
          sp.section_id,
          sp.category_id,
          sp.is_active,
          pc.name as category_name,
          pc.supplier_id,
          sup.name as supplier_name,
          s.name as section_name
        FROM section_products sp
        LEFT JOIN product_categories pc ON sp.category_id = pc.id
        LEFT JOIN suppliers sup ON pc.supplier_id = sup.id
        LEFT JOIN sections s ON sp.section_id = s.id
        WHERE s.restaurant_id = $1`;

      const params: any[] = [restaurantId];

      if (sectionId) {
        params.push(Number(sectionId));
        query += ` AND sp.section_id = $${params.length}`;
      }

      if (activeOnly) {
        query += ` AND sp.is_active = true`;
      }

      query += ` ORDER BY sp.name`;

      const result = await client.query(query, params);
      return result.rows;
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching section products:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/section-products
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { name, unit, section_id, category_id, is_active, poster_ingredient_id } = req.body;

    if (!name || !section_id) {
      return res.status(400).json({
        success: false,
        error: 'Name and section_id are required',
      });
    }

    // Generate a unique ID for custom products (prefix with 'custom_')
    const ingredientId = poster_ingredient_id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const product = await withTenant(restaurantId, async (client) => {
      // Verify section belongs to this restaurant
      const sectionCheck = await client.query(
        `SELECT id FROM sections WHERE id = $1 AND restaurant_id = $2`,
        [section_id, restaurantId]
      );

      if (sectionCheck.rows.length === 0) {
        return null; // Section not found or doesn't belong to this restaurant
      }

      const result = await client.query(
        `INSERT INTO section_products (name, unit, section_id, category_id, is_active, poster_ingredient_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, unit || null, section_id, category_id || null, is_active !== false, ingredientId]
      );
      return result.rows[0];
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/section-products
router.patch('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { id, name, unit, section_id, category_id, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const product = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE section_products sp
         SET name = COALESCE($1, sp.name),
             unit = COALESCE($2, sp.unit),
             section_id = COALESCE($3, sp.section_id),
             category_id = COALESCE($4, sp.category_id),
             is_active = COALESCE($5, sp.is_active),
             updated_at = CURRENT_TIMESTAMP
         FROM sections s
         WHERE sp.id = $6 AND sp.section_id = s.id AND s.restaurant_id = $7
         RETURNING sp.*`,
        [name, unit, section_id, category_id, is_active, id, restaurantId]
      );
      return result.rows[0];
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/section-products
router.delete('/', requireAuth, async (req, res: Response) => {
  try {
    const productId = req.query.id as string;
    const { restaurantId } = req as AuthenticatedRequest;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const result = await withTenant(restaurantId, async (client) => {
      // Check if product is from Poster (non-custom) and belongs to this restaurant
      const checkResult = await client.query(
        `SELECT sp.poster_ingredient_id 
         FROM section_products sp
         JOIN sections s ON sp.section_id = s.id
         WHERE sp.id = $1 AND s.restaurant_id = $2`,
        [productId, restaurantId]
      );

      if (checkResult.rows.length === 0) {
        return { error: 'Product not found' };
      }

      const ingredientId = checkResult.rows[0].poster_ingredient_id;
      // Only allow deletion of custom products (prefixed with 'custom_')
      if (ingredientId && !ingredientId.startsWith('custom_')) {
        return { error: 'Невозможно удалить товар из Poster' };
      }

      const deleteResult = await client.query(
        `DELETE FROM section_products sp
         USING sections s
         WHERE sp.id = $1 AND sp.section_id = s.id AND s.restaurant_id = $2
         RETURNING sp.id`,
        [productId, restaurantId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ('error' in result) {
      return res.status(403).json({ success: false, error: result.error });
    }

    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
