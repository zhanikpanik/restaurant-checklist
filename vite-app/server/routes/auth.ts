import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../lib/db';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }

    const result = await pool.query(
      `SELECT u.*, r.name as restaurant_name 
       FROM users u 
       LEFT JOIN restaurants r ON r.id = u.restaurant_id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurant_id: user.restaurant_id,
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurant_id: user.restaurant_id,
          restaurant_name: user.restaurant_name,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get current session
router.get('/session', (req: Request, res: Response) => {
  if (req.session.user) {
    res.json({
      success: true,
      data: { user: req.session.user },
    });
  } else {
    res.json({
      success: true,
      data: { user: null },
    });
  }
});

export default router;
