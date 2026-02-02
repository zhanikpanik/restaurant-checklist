import { Router, Response } from "express";
import { withTenant, withoutTenant } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router = Router();

// GET - Sync sections from Poster
router.get("/", requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    // Get restaurant's Poster token (needs withoutTenant since restaurants table has no RLS)
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, error: "Restaurant not found" });
    }

    const { poster_token, poster_account_name } = restaurant;

    if (!poster_token || !poster_account_name) {
      return res.status(400).json({ success: false, error: "Poster integration not configured" });
    }

    // Fetch storages from Poster
    const storagesUrl = `https://${poster_account_name}.joinposter.com/api/storage.getStorages?token=${poster_token}`;
    console.log("Fetching storages from:", storagesUrl.replace(poster_token, "***"));
    
    const storagesResponse = await fetch(storagesUrl);

    if (!storagesResponse.ok) {
      console.error("Poster API error:", storagesResponse.status, await storagesResponse.text());
      return res.status(500).json({ success: false, error: "Failed to fetch storages from Poster" });
    }

    const storagesData = await storagesResponse.json();
    console.log("Poster storages response:", JSON.stringify(storagesData));
    const storages = storagesData.response || [];

    console.log(`Found ${storages.length} storages from Poster`);

    // Sync storages as sections using withTenant for proper isolation
    const syncedCount = await withTenant(restaurantId, async (client) => {
      let count = 0;
      
      for (const storage of storages) {
        const emoji = getStorageEmoji(storage.storage_name);

        // Check if section already exists for this restaurant
        const existingSection = await client.query(
          "SELECT id FROM sections WHERE poster_storage_id = $1 AND restaurant_id = $2",
          [storage.storage_id, restaurantId]
        );

        if (existingSection.rows.length > 0) {
          // Update existing section
          await client.query(
            `UPDATE sections
             SET name = $1, emoji = $2, is_active = true
             WHERE poster_storage_id = $3 AND restaurant_id = $4`,
            [storage.storage_name, emoji, storage.storage_id, restaurantId]
          );
        } else {
          // Create new section
          await client.query(
            `INSERT INTO sections (
              restaurant_id, name, emoji, poster_storage_id, is_active
            ) VALUES ($1, $2, $3, $4, true)`,
            [restaurantId, storage.storage_name, emoji, storage.storage_id]
          );
        }
        count++;
      }
      
      return count;
    });

    console.log(`Synced ${syncedCount} sections`);

    // Also sync ingredients for all sections
    let ingredientsSynced = 0;
    let ingredientError: string | null = null;
    try {
      ingredientsSynced = await syncIngredientsForSections(restaurantId, poster_token, poster_account_name);
      console.log(`Synced ${ingredientsSynced} ingredients`);
    } catch (err) {
      console.error("Error syncing ingredients:", err);
      ingredientError = err instanceof Error ? err.message : "Unknown error";
      // Continue - sections were synced successfully
    }

    res.json({
      success: true,
      data: { syncedCount, ingredientsSynced, ingredientError },
    });
  } catch (error) {
    console.error("Sync sections error:", error);
    res.status(500).json({ success: false, error: "Failed to sync sections" });
  }
});

async function syncIngredientsForSections(
  restaurantId: string,
  posterToken: string,
  posterAccountName: string
): Promise<number> {
  // Fetch all ingredients from Poster
  const ingredientsUrl = `https://${posterAccountName}.joinposter.com/api/menu.getIngredients?token=${posterToken}`;
  console.log("Fetching ingredients from:", ingredientsUrl.replace(posterToken, "***"));
  const ingredientsResponse = await fetch(ingredientsUrl);

  if (!ingredientsResponse.ok) {
    console.error("Failed to fetch ingredients:", ingredientsResponse.status);
    throw new Error("Failed to fetch ingredients from Poster");
  }

  const ingredientsData = await ingredientsResponse.json();
  const ingredients = ingredientsData.response || [];
  console.log(`Found ${ingredients.length} ingredients from Poster`);

  // Get all sections for this restaurant
  const sections = await withTenant(restaurantId, async (client) => {
    const result = await client.query(
      "SELECT id, poster_storage_id FROM sections WHERE poster_storage_id IS NOT NULL AND restaurant_id = $1",
      [restaurantId]
    );
    return result.rows;
  });

  console.log(`Found ${sections.length} sections with poster_storage_id for restaurant ${restaurantId}`);

  if (sections.length === 0) {
    console.log("No sections with poster_storage_id found, skipping ingredient sync");
    return 0;
  }

  let totalSynced = 0;

  for (const section of sections) {
    // Get storage leftovers to know which ingredients belong to this storage
    const leftoversUrl = `https://${posterAccountName}.joinposter.com/api/storage.getStorageLeftovers?token=${posterToken}&storage_id=${section.poster_storage_id}`;
    const leftoversResponse = await fetch(leftoversUrl);

    let leftovers: any[] = [];
    if (leftoversResponse.ok) {
      const leftoversData = await leftoversResponse.json();
      leftovers = leftoversData.response || [];
    } else {
      console.warn(`Could not fetch leftovers for storage ${section.poster_storage_id}, will sync all ingredients`);
    }

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
    console.log(`Synced ${syncedCount} ingredients for section ${section.id} (${hasLeftovers ? 'with leftovers' : 'empty storage - all ingredients'})`);
  }

  return totalSynced;
}

function getStorageEmoji(storageName: string): string {
  const lowerName = storageName.toLowerCase();
  if (lowerName.includes("кухня")) return "🍳";
  if (lowerName.includes("бар")) return "🍷";
  if (lowerName.includes("горничная")) return "🧹";
  if (lowerName.includes("склад")) return "📦";
  if (lowerName.includes("офис")) return "💼";
  if (lowerName.includes("ресепшн")) return "🔑";
  return "📍";
}

export default router;
