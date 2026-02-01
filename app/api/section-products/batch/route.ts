import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * PATCH /api/section-products/batch
 * Batch update category_id for multiple products
 * 
 * Body: { product_ids: number[], category_id: number | null }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const body = await request.json();
    const { product_ids, category_id } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "product_ids array is required" },
        { status: 400 }
      );
    }

    if (product_ids.length > 500) {
      return NextResponse.json(
        { success: false, error: "Maximum 500 products per batch" },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    if (!product_ids.every((id) => typeof id === "number" && Number.isInteger(id))) {
      return NextResponse.json(
        { success: false, error: "All product_ids must be integers" },
        { status: 400 }
      );
    }

    const result = await withTenant(restaurantId, async (client) => {
      // If category_id is provided, verify it belongs to this restaurant
      if (category_id !== null && category_id !== undefined) {
        const categoryCheck = await client.query(
          `SELECT id FROM product_categories WHERE id = $1 AND restaurant_id = $2`,
          [category_id, restaurantId]
        );
        if (categoryCheck.rows.length === 0) {
          return { error: "Category not found", status: 404 };
        }
      }

      // Update all products that belong to this restaurant's sections
      const updateResult = await client.query(
        `UPDATE section_products sp
         SET category_id = $1,
             updated_at = CURRENT_TIMESTAMP
         FROM sections s
         WHERE sp.id = ANY($2::int[])
           AND sp.section_id = s.id
           AND s.restaurant_id = $3
         RETURNING sp.id`,
        [category_id, product_ids, restaurantId]
      );

      return { 
        updatedCount: updateResult.rowCount || 0,
        updatedIds: updateResult.rows.map((r) => r.id)
      };
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.updatedCount,
        updatedIds: result.updatedIds,
      },
      message: `Updated ${result.updatedCount} products`,
    });
  } catch (error) {
    console.error("Error batch updating products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
