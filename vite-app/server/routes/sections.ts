import { Router, Response } from 'express';
import { withTenant } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// GET /api/sections
router.get('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    const sections = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT
          s.id,
          s.name,
          s.emoji,
          s.poster_storage_id,
          COUNT(sp.id) as custom_products_count
        FROM sections s
        LEFT JOIN section_products sp ON sp.section_id = s.id AND sp.is_active = true
        WHERE s.restaurant_id = $1
        GROUP BY s.id, s.name, s.emoji, s.poster_storage_id
        ORDER BY s.name`,
        [restaurantId]
      );
      return result.rows;
    });

    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/sections
router.post('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { name, emoji, poster_storage_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const section = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [restaurantId, name, emoji || null, poster_storage_id || null]
      );
      return result.rows[0];
    });

    res.json({ success: true, data: section, message: 'Section created successfully' });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/sections
router.patch('/', requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { id, name, emoji, poster_storage_id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Section ID is required' });
    }

    const section = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE sections
         SET name = COALESCE($1, name),
             emoji = COALESCE($2, emoji),
             poster_storage_id = COALESCE($3, poster_storage_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND restaurant_id = $5
         RETURNING *`,
        [name, emoji, poster_storage_id, id, restaurantId]
      );
      return result.rows[0];
    });

    if (!section) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }

    res.json({ success: true, data: section, message: 'Section updated successfully' });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/sections
router.delete('/', requireAuth, async (req, res: Response) => {
  try {
    const sectionId = req.query.id as string;
    const { restaurantId } = req as AuthenticatedRequest;

    if (!sectionId) {
      return res.status(400).json({ success: false, error: 'Section ID is required' });
    }

    const result = await withTenant(restaurantId, async (client) => {
      const checkResult = await client.query(
        `SELECT poster_storage_id FROM sections WHERE id = $1 AND restaurant_id = $2`,
        [sectionId, restaurantId]
      );

      if (checkResult.rows.length > 0 && checkResult.rows[0].poster_storage_id) {
        return { error: 'Cannot delete Poster section' };
      }

      const deleteResult = await client.query(
        `DELETE FROM sections WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
        [sectionId, restaurantId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ('error' in result) {
      return res.status(403).json({ success: false, error: result.error });
    }

    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }

    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
