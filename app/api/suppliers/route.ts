import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getCached } from "@/lib/server-cache";
import type { Supplier, ApiResponse } from "@/types";

// GET /api/suppliers - Get all suppliers (synced from Poster)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryRestaurantId = searchParams.get("restaurant_id");

    let restaurantId: string;

    if (queryRestaurantId) {
      // If restaurant_id is provided in query, use it (for onboarding)
      restaurantId = queryRestaurantId;
    } else {
      // Otherwise require authentication
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) {
        return auth;
      }
      restaurantId = auth.restaurantId;
    }

    const suppliers = await getCached(
      `suppliers:${restaurantId}`,
      120_000, // 2 min TTL — suppliers change rarely
      async () => {
        return await withTenant(restaurantId, async (client) => {
          const result = await client.query<Supplier>(
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
      }
    );

    return NextResponse.json<ApiResponse<Supplier[]>>(
      { success: true, data: suppliers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST, PATCH, DELETE removed - suppliers are now managed via Poster sync only
// Use POST /api/poster/sync-suppliers to sync from Poster
