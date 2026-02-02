import { Request, Response, NextFunction } from 'express';

// Extend Express Session to include our user data
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      name: string;
      role: 'admin' | 'manager' | 'staff' | 'delivery';
      restaurant_id: number;
    };
  }
}

export interface AuthenticatedRequest extends Request {
  restaurantId: string;
  userId: number;
  userRole: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.session?.user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  (req as AuthenticatedRequest).restaurantId = user.restaurant_id.toString();
  (req as AuthenticatedRequest).userId = user.id;
  (req as AuthenticatedRequest).userRole = user.role;
  
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session?.user;
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    (req as AuthenticatedRequest).restaurantId = user.restaurant_id.toString();
    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).userRole = user.role;
    
    next();
  };
}
