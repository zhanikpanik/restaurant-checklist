import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/lib/auth-config";

/**
 * Middleware to require authentication on API routes
 * Returns restaurant_id and user info if authenticated, or sends error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ restaurantId: string; userId?: number; userRole?: string } | NextResponse> {
  const restaurantId = request.cookies.get("restaurant_id")?.value;

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

  // Verify restaurant exists
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id FROM restaurants WHERE id = $1 AND is_active = true`,
        [restaurantId]
      );
      if (result.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid restaurant",
            message: `Restaurant ${restaurantId} is not available`,
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("Error verifying restaurant:", error);
      // Don't block the request on DB errors — middleware already verified auth
    }
  }

  const session = await auth();

  return {
    restaurantId,
    userId: session?.user?.id ? parseInt(session.user.id) : undefined,
    userRole: session?.user?.role,
  };
}


