import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const count = await withTenant(restaurantId, async (client) => {
      // Unsorted means it doesn't have a direct supplier and its category doesn't either
      const result = await client.query(`
        SELECT COUNT(sp.id) as count
        FROM section_products sp
        LEFT JOIN product_categories pc ON sp.category_id = pc.id
        LEFT JOIN sections s ON sp.section_id = s.id
        WHERE s.restaurant_id = $1 
          AND sp.supplier_id IS NULL 
          AND pc.supplier_id IS NULL
          AND sp.is_active = true
      `, [restaurantId]);
      
      return parseInt(result.rows[0].count, 10);
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching unsorted count:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
