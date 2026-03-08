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
        // Iterate through ingredient -> supplier mappings
        for (const [sectionProductId, supplierId] of Object.entries(mappings)) {
          await client.query(
            `UPDATE section_products 
             SET supplier_id = $1 
             WHERE id = $2`,
            [supplierId, sectionProductId]
          );
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

    return NextResponse.json({ success: true, message: "Ingredient mappings applied" });
  } catch (error) {
    console.error("Ingredient Mapping API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
