import { Router, Response } from "express";
import { withTenant } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router = Router();

// GET - Get sections assigned to a user
router.get("/", requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId, userId, userRole } = req as AuthenticatedRequest;
    const userIdParam = req.query.user_id as string | undefined;
    
    // If user_id provided and user is admin, get that user's sections
    // Otherwise get current user's sections
    const targetUserId = userIdParam && (userRole === "admin" || userRole === "manager")
      ? parseInt(userIdParam) 
      : userId;

    const sections = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT s.id, s.name, s.emoji, s.poster_storage_id
         FROM user_sections us
         JOIN sections s ON s.id = us.section_id
         WHERE us.user_id = $1 AND s.is_active = true
         ORDER BY s.name`,
        [targetUserId]
      );
      return result.rows;
    });

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Error fetching user sections:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user sections" });
  }
});

// POST - Assign sections to a user (admin only)
router.post("/", requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId, userRole } = req as AuthenticatedRequest;
    
    // Only admin can assign sections
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ success: false, error: "Only admins can assign sections" });
    }

    const { user_id, section_ids } = req.body;

    if (!user_id || !Array.isArray(section_ids)) {
      return res.status(400).json({ success: false, error: "user_id and section_ids array are required" });
    }

    await withTenant(restaurantId, async (client) => {
      // First, remove all existing assignments for this user (only for sections in this restaurant)
      await client.query(
        `DELETE FROM user_sections 
         WHERE user_id = $1 
         AND section_id IN (SELECT id FROM sections WHERE restaurant_id = $2)`,
        [user_id, restaurantId]
      );

      // Then, insert new assignments
      if (section_ids.length > 0) {
        const values = section_ids.map((_: number, index: number) => 
          `($1, $${index + 2})`
        ).join(", ");
        
        await client.query(
          `INSERT INTO user_sections (user_id, section_id) VALUES ${values}
           ON CONFLICT (user_id, section_id) DO NOTHING`,
          [user_id, ...section_ids]
        );
      }
    });

    res.json({
      success: true,
      message: "Sections assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning sections:", error);
    res.status(500).json({ success: false, error: "Failed to assign sections" });
  }
});

// DELETE - Remove section assignment (admin only)
router.delete("/", requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId, userRole } = req as AuthenticatedRequest;
    
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ success: false, error: "Only admins can modify section assignments" });
    }

    const userIdParam = req.query.user_id as string | undefined;
    const sectionId = req.query.section_id as string | undefined;

    if (!userIdParam || !sectionId) {
      return res.status(400).json({ success: false, error: "user_id and section_id are required" });
    }

    await withTenant(restaurantId, async (client) => {
      // Verify section belongs to this restaurant before deleting
      await client.query(
        `DELETE FROM user_sections 
         WHERE user_id = $1 
         AND section_id = $2
         AND section_id IN (SELECT id FROM sections WHERE restaurant_id = $3)`,
        [parseInt(userIdParam), parseInt(sectionId), restaurantId]
      );
    });

    res.json({
      success: true,
      message: "Section assignment removed",
    });
  } catch (error) {
    console.error("Error removing section assignment:", error);
    res.status(500).json({ success: false, error: "Failed to remove section assignment" });
  }
});

export default router;
