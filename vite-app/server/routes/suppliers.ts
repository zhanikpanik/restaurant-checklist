import { Router, Response } from 'express';
import { withTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// GET /api/suppliers
router.get('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    const suppliers = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT s.*,
                COUNT(DISTINCT pc.id) as categories_count
         FROM suppliers s
         LEFT JOIN product_categories pc ON pc.supplier_id = s.id
         WHERE s.restaurant_id = $1
         GROUP BY s.id
         ORDER BY s.name`,
        [restaurantId]
      );
      return result.rows;
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/suppliers
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const supplierData = req.body;

    if (!supplierData.name) {
      return res.status(400).json({
        success: false,
        error: 'Supplier name is required',
      });
    }

    const supplier = await withTenant(restaurantId, async (client) => {
      // Check if supplier already exists for this restaurant
      const existingCheck = await client.query(
        `SELECT id FROM suppliers WHERE name = $1 AND restaurant_id = $2`,
        [supplierData.name, restaurantId]
      );

      if (existingCheck.rows.length > 0) {
        return null; // Supplier exists
      }

      // Insert new supplier
      const result = await client.query(
        `INSERT INTO suppliers
         (restaurant_id, name, phone, contact_info, poster_supplier_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          restaurantId,
          supplierData.name,
          supplierData.phone || null,
          supplierData.contact_info || null,
          supplierData.poster_supplier_id || null,
        ]
      );
      return result.rows[0];
    });

    if (!supplier) {
      return res.status(409).json({
        success: false,
        error: 'Supplier with this name already exists',
      });
    }

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/suppliers
router.patch('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Supplier ID is required',
      });
    }

    // Build dynamic update query
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');

    const supplier = await withTenant(restaurantId, async (client) => {
      const query = `
        UPDATE suppliers
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND restaurant_id = $${fields.length + 2}
        RETURNING *
      `;
      const result = await client.query(query, [id, ...values, restaurantId]);
      return result.rows[0];
    });

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/suppliers
router.delete('/', requireAuth, async (req, res: Response) => {
  try {
    const supplierId = req.query.id as string;
    const { restaurantId } = req as AuthenticatedRequest;

    if (!supplierId) {
      return res.status(400).json({ success: false, error: 'Supplier ID is required' });
    }

    const result = await withTenant(restaurantId, async (client) => {
      // Check if supplier has associated categories
      const associatedCheck = await client.query(
        `SELECT COUNT(*) as categories_count 
         FROM product_categories 
         WHERE supplier_id = $1 AND restaurant_id = $2`,
        [supplierId, restaurantId]
      );

      const { categories_count } = associatedCheck.rows[0];

      if (parseInt(categories_count) > 0) {
        return { error: `Cannot delete supplier with ${categories_count} categories` };
      }

      const deleteResult = await client.query(
        `DELETE FROM suppliers WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
        [supplierId, restaurantId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ('error' in result) {
      return res.status(409).json({ success: false, error: result.error });
    }

    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
