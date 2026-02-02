import { Router, Response } from 'express';
import { requireRole, AuthenticatedRequest } from '../lib/auth';
import { createUser, getUsersByRestaurant, getUsersWithSections, updateUserRole, deactivateUser } from '../lib/users';

const router = Router();

// GET /api/users - List users (admin/manager only)
router.get('/', requireRole('admin', 'manager'), async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    // Check if sections should be included (avoids N+1 on client)
    const includeSections = req.query.include_sections === 'true';

    const users = includeSections
      ? await getUsersWithSections(restaurantId)
      : await getUsersByRestaurant(restaurantId);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create new user (admin/manager only)
router.post('/', requireRole('admin', 'manager'), async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, name, and role are required',
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'staff', 'delivery'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const user = await createUser({
      email,
      password,
      name,
      role,
      restaurantId,
    });

    res.json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);

    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PATCH /api/users - Update user (admin/manager only)
router.patch('/', requireRole('admin', 'manager'), async (req, res: Response) => {
  try {
    const { id, role } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (role) {
      const validRoles = ['admin', 'manager', 'staff', 'delivery'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
      }
      await updateUserRole(id, role);
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/users - Deactivate user (admin/manager only)
router.delete('/', requireRole('admin', 'manager'), async (req, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const targetUserId = req.query.id as string;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Prevent self-deactivation
    if (parseInt(targetUserId) === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account',
      });
    }

    await deactivateUser(parseInt(targetUserId));

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate user' });
  }
});

export default router;
