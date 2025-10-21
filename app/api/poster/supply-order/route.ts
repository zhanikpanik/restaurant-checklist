import { NextRequest, NextResponse } from "next/server";
import { posterAPI } from "@/lib/poster-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, storage_id, items, comment } = body;

    if (!supplier_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "supplier_id and items are required" },
        { status: 400 }
      );
    }

    // Create supply order in Poster
    const result = await posterAPI.createSupplyOrder({
      supplier_id: Number(supplier_id),
      storage_id: Number(storage_id) || 1, // Default storage if not provided
      ingredients: items.map((item: any) => ({
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        price: item.price || 0,
      })),
      comment: comment || "Заказ из приложения",
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Supply order sent to Poster successfully",
    });
  } catch (error) {
    console.error("Error creating Poster supply order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
