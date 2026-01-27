import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";
import type { Restaurant, ApiResponse } from "@/types";

/**
 * GET /api/restaurants - Get all restaurants
 * 
 * NOTE: Uses withoutTenant because this is an admin/cross-tenant operation
 * (restaurants table doesn't have RLS since it's the top-level entity)
 */
export async function GET(request: NextRequest) {
  try {
    const restaurants = await withoutTenant(async (client) => {
      const result = await client.query<Restaurant>(
        `SELECT * FROM restaurants
         WHERE is_active = true
         ORDER BY name`
      );
      return result.rows;
    });

    return NextResponse.json<ApiResponse<Restaurant[]>>({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
