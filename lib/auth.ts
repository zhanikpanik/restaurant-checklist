import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { auth } from "@/lib/auth-config";

export interface AuthContext {
  restaurantId: string;
  isAuthenticated: boolean;
  userId?: number;
  userRole?: string;
}

/**
 * Extract restaurant_id from cookies
 * Used for tenant isolation across all API routes
 */
export function getRestaurantIdFromRequest(request: NextRequest): string | null {
  const cookieStore = request.cookies;
  const restaurantId = cookieStore.get("restaurant_id")?.value;
  return restaurantId || null;
}

/**
 * Verify that the restaurant exists and is active
 */
export async function verifyRestaurant(restaurantId: string): Promise<boolean> {
  if (!pool) {
    throw new Error("Database connection not available");
  }

  try {
    const result = await pool.query(
      `SELECT id, is_active FROM restaurants WHERE id = $1 AND is_active = true`,
      [restaurantId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error verifying restaurant:", error);
    return false;
  }
}

/**
 * Middleware to require authentication on API routes
 * Returns restaurant_id and user info if authenticated, or sends error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ restaurantId: string; userId?: number; userRole?: string } | NextResponse> {
  const restaurantId = getRestaurantIdFromRequest(request);

  if (!restaurantId) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required",
        message: "Please select a restaurant to continue",
      },
      { status: 401 }
    );
  }

  // Verify restaurant exists and is active
  const isValid = await verifyRestaurant(restaurantId);
  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid restaurant",
        message: "Selected restaurant is not available",
      },
      { status: 403 }
    );
  }

  // Get session for user info
  const session = await auth();
  
  return { 
    restaurantId,
    userId: session?.user?.id ? parseInt(session.user.id) : undefined,
    userRole: session?.user?.role,
  };
}

/**
 * Get current restaurant ID from server-side cookies
 * For use in server components and API routes
 */
export async function getCurrentRestaurantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("restaurant_id")?.value || null;
}

/**
 * Validate that a resource belongs to the authenticated restaurant
 * Prevents cross-tenant data access
 */
export async function validateResourceAccess(
  restaurantId: string,
  tableName: string,
  resourceId: number | string
): Promise<boolean> {
  if (!pool) {
    throw new Error("Database connection not available");
  }

  try {
    const result = await pool.query(
      `SELECT restaurant_id FROM ${tableName} WHERE id = $1`,
      [resourceId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].restaurant_id === restaurantId;
  } catch (error) {
    console.error("Error validating resource access:", error);
    return false;
  }
}
