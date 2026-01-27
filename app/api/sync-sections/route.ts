import { NextRequest, NextResponse } from "next/server";
import { withTenant, withoutTenant } from "@/lib/db";

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

    // Get restaurant's Poster token (needs withoutTenant since restaurants table has no RLS)
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

    // Fetch storages from Poster
    const storagesUrl = `https://${poster_account_name}.joinposter.com/api/storage.getStorage?token=${poster_token}`;
    const storagesResponse = await fetch(storagesUrl);

    if (!storagesResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch storages from Poster" },
        { status: 500 }
      );
    }

    const storagesData = await storagesResponse.json();
    const storages = storagesData.response || [];

    console.log(`Found ${storages.length} storages from Poster`);

    // Sync storages as sections using withTenant for proper isolation
    const syncedCount = await withTenant(restaurantId, async (client) => {
      let count = 0;
      
      for (const storage of storages) {
        const emoji = getStorageEmoji(storage.storage_name);

        // Check if section already exists
        const existingSection = await client.query(
          "SELECT id FROM sections WHERE poster_storage_id = $1",
          [storage.storage_id]
        );

        if (existingSection.rows.length > 0) {
          // Update existing section
          await client.query(
            `UPDATE sections
             SET name = $1, emoji = $2, is_active = true
             WHERE poster_storage_id = $3`,
            [storage.storage_name, emoji, storage.storage_id]
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

    return NextResponse.json({
      success: true,
      data: { syncedCount },
    });
  } catch (error) {
    console.error("Sync sections error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync sections" },
      { status: 500 }
    );
  }
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
