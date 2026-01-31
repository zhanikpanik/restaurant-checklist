import { NextRequest, NextResponse } from "next/server";
import { withTenant, withoutTenant } from "@/lib/db";

interface PosterIngredient {
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit: string;
  type: string;
  category_id?: string;
  category_name?: string;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    if (!restaurantCookie?.value) {
      return NextResponse.json(
        { success: false, error: "No restaurant selected" },
        { status: 401 }
      );
    }

    const restaurantId = restaurantCookie.value;

    // Get restaurant's Poster token
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { poster_token, poster_account_name } = restaurant;

    if (!poster_token || !poster_account_name) {
      return NextResponse.json(
        { success: false, error: "Poster integration not configured" },
        { status: 400 }
      );
    }

    // Fetch all ingredients from Poster
    const ingredientsUrl = `https://${poster_account_name}.joinposter.com/api/menu.getIngredients?token=${poster_token}`;
    console.log("Fetching ingredients from:", ingredientsUrl.replace(poster_token, "***"));

    const ingredientsResponse = await fetch(ingredientsUrl);

    if (!ingredientsResponse.ok) {
      console.error("Poster API error:", ingredientsResponse.status, await ingredientsResponse.text());
      return NextResponse.json(
        { success: false, error: "Failed to fetch ingredients from Poster" },
        { status: 500 }
      );
    }

    const ingredientsData = await ingredientsResponse.json();
    console.log("Poster ingredients response:", JSON.stringify(ingredientsData).substring(0, 500));
    const ingredients: PosterIngredient[] = ingredientsData.response || [];

    console.log(`Found ${ingredients.length} ingredients from Poster`);

    // Get all sections for this restaurant
    const sections = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        "SELECT id, poster_storage_id FROM sections WHERE poster_storage_id IS NOT NULL AND restaurant_id = $1",
        [restaurantId]
      );
      return result.rows;
    });

    if (sections.length === 0) {
      return NextResponse.json({
        success: true,
        data: { syncedCount: 0, message: "No Poster sections found. Sync sections first." },
      });
    }

    // For each section, sync ingredients
    let totalSynced = 0;

    for (const section of sections) {
      // Get storage leftovers to know which ingredients belong to this storage
      const leftoversUrl = `https://${poster_account_name}.joinposter.com/api/storage.getStorageLeftovers?token=${poster_token}&storage_id=${section.poster_storage_id}`;
      console.log(`Fetching leftovers for storage ${section.poster_storage_id}...`);

      const leftoversResponse = await fetch(leftoversUrl);

      let leftovers: any[] = [];
      if (leftoversResponse.ok) {
        const leftoversData = await leftoversResponse.json();
        leftovers = leftoversData.response || [];
      } else {
        console.warn(`Could not fetch leftovers for storage ${section.poster_storage_id}, will sync all ingredients`);
      }

      console.log(`Found ${leftovers.length} leftovers for storage ${section.poster_storage_id}`);

      // Create a map of ingredient_id to leftover data
      const leftoverMap = new Map<string, any>();
      for (const leftover of leftovers) {
        leftoverMap.set(String(leftover.ingredient_id), leftover);
      }

      // For empty storages (no leftovers), sync ALL ingredients
      // For storages with leftovers, only sync those with inventory
      const hasLeftovers = leftovers.length > 0;

      // Sync ingredients
      const syncedCount = await withTenant(restaurantId, async (client) => {
        let count = 0;

        for (const ingredient of ingredients) {
          // If storage has leftovers, only sync ingredients that exist in this storage
          // If storage is empty, sync ALL ingredients so user can use any
          if (hasLeftovers) {
            const leftover = leftoverMap.get(String(ingredient.ingredient_id));
            if (!leftover) continue;
          }

          // Check if product already exists
          const existingProduct = await client.query(
            "SELECT id FROM section_products WHERE section_id = $1 AND poster_ingredient_id = $2",
            [section.id, ingredient.ingredient_id]
          );

          if (existingProduct.rows.length > 0) {
            // Update existing product
            await client.query(
              `UPDATE section_products
               SET name = $1, unit = $2, is_active = true, updated_at = CURRENT_TIMESTAMP
               WHERE section_id = $3 AND poster_ingredient_id = $4`,
              [ingredient.ingredient_name, ingredient.ingredient_unit, section.id, ingredient.ingredient_id]
            );
          } else {
            // Create new product
            await client.query(
              `INSERT INTO section_products (section_id, poster_ingredient_id, name, unit, is_active)
               VALUES ($1, $2, $3, $4, true)`,
              [section.id, ingredient.ingredient_id, ingredient.ingredient_name, ingredient.ingredient_unit]
            );
          }
          count++;
        }

        return count;
      });

      totalSynced += syncedCount;
      console.log(`Synced ${syncedCount} ingredients for section ${section.id}`);
    }

    console.log(`Total synced: ${totalSynced} ingredients`);

    return NextResponse.json({
      success: true,
      data: { syncedCount: totalSynced },
    });
  } catch (error) {
    console.error("Sync ingredients error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync ingredients" },
      { status: 500 }
    );
  }
}
