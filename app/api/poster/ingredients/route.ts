import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withoutTenant } from "@/lib/db";
import { PosterAPI } from "@/lib/poster-api";
import { PosterIngredient } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const restaurantId = session.user.restaurantId;

    // Get restaurant's Poster token
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT poster_token FROM restaurants WHERE id = $1",
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant?.poster_token) {
      return NextResponse.json({
        success: false,
        error: "Poster not configured for this restaurant",
      });
    }

    // Initialize Poster API
    const posterAPI = new PosterAPI(restaurant.poster_token);

    // Fetch ingredients
    try {
      console.log("[Ingredients API] Fetching ingredients from Poster...");
      const ingredients = await posterAPI.getIngredients() as PosterIngredient[];
      
      console.log(`[Ingredients API] Got ${ingredients.length} ingredients from Poster`);
      
      // Index by ID for easier lookup
      const resultMap: Record<string, { price: number; unit: string }> = {};

      if (ingredients.length > 0) {
        console.log("[Ingredients API] Sample ingredient:", JSON.stringify(ingredients[0], null, 2));
      }

      // Unit translation map
      const unitMap: Record<string, string> = {
        'kg': 'кг',
        'l': 'л',
        'pcs': 'шт',
        'p': 'шт',
        'pt': 'шт',
        'unit': 'шт',
        'pack': 'уп',
        'bottle': 'бут',
        'can': 'банка',
        'portion': 'порц',
        'g': 'г',
        'ml': 'мл'
      };

      if (Array.isArray(ingredients)) {
        ingredients.forEach(ing => {
          if (ing.ingredient_id) {
            // Try all possible price fields from Poster API
            const rawPrice = ing.average_price ?? (ing as any).cost ?? (ing as any).price ?? 0;
            const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
            
            // Translate unit
            let unit = ing.ingredient_unit || "";
            if (unit && unitMap[unit.toLowerCase()]) {
              unit = unitMap[unit.toLowerCase()];
            }

            const info = {
              price: price,
              unit: unit
            };

            // Map by all possible ID formats for robustness
            resultMap[String(ing.ingredient_id)] = info;
            if ((ing as any).id) resultMap[String((ing as any).id)] = info;
          }
        });
      }
      
      console.log("[Ingredients API] Result map size:", Object.keys(resultMap).length);

      return NextResponse.json({
        success: true,
        data: resultMap
      });
    } catch (e) {
      console.error("[Ingredients API] Failed to fetch ingredients:", e);
      throw e;
    }
  } catch (error) {
    console.error("Error fetching Poster ingredients:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
