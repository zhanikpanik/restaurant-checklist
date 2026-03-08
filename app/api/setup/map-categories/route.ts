import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, mappings } = await request.json();

    if (!restaurantId || !mappings) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });
    }

    await withoutTenant(async (client) => {
      await client.query("BEGIN");

      try {
        // Iterate through category -> supplier mappings
        for (const [categoryId, supplierId] of Object.entries(mappings)) {
          // 1. Update the category itself
          await client.query(
            `UPDATE product_categories 
             SET supplier_id = $1 
             WHERE id = $2 AND restaurant_id = $3`,
            [supplierId, categoryId, restaurantId]
          );

          // 2. Update all products in this category that don't have a supplier yet
          await client.query(
            `UPDATE section_products sp
             SET supplier_id = $1
             FROM sections s
             WHERE sp.section_id = s.id 
             AND s.restaurant_id = $2
             AND sp.category_id = $3
             AND sp.supplier_id IS NULL`,
            [supplierId, restaurantId, categoryId]
          );
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

    return NextResponse.json({ success: true, message: "Mappings applied" });
  } catch (error) {
    console.error("Mapping API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
