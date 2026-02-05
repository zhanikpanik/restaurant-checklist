import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const body = await request.json();
    const { product_ids, supplier_id } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product IDs are required" },
        { status: 400 }
      );
    }

    if (!supplier_id) {
        return NextResponse.json(
          { success: false, error: "Supplier ID is required" },
          { status: 400 }
        );
    }

    const updatedCount = await withTenant(restaurantId, async (client) => {
        // Direct update of supplier_id (Schema migration completed)
        
        // Verify products belong to this restaurant via sections join
        const updateRes = await client.query(
            `UPDATE section_products sp
             SET supplier_id = $1, updated_at = CURRENT_TIMESTAMP
             FROM sections s
             WHERE sp.id = ANY($2) 
             AND sp.section_id = s.id 
             AND s.restaurant_id = $3`,
            [supplier_id, product_ids, restaurantId]
        );

        return updateRes.rowCount;
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} products`,
      data: { updatedCount }
    });

  } catch (error) {
    console.error("Error bulk updating products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}