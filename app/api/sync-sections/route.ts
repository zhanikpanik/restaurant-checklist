import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection error" },
        { status: 500 }
      );
    }

    // Get restaurant's Poster token
    const restaurantResult = await pool.query(
      "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { poster_token, poster_account_name } = restaurantResult.rows[0];

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

    console.log(`📦 Found ${storages.length} storages from Poster`);

    // Sync storages as sections
    let syncedCount = 0;
    for (const storage of storages) {
      const emoji = getStorageEmoji(storage.storage_name);

      // Check if section already exists
      const existingSection = await pool.query(
        "SELECT id FROM sections WHERE poster_storage_id = $1 AND restaurant_id = $2",
        [storage.storage_id, restaurantId]
      );

      if (existingSection.rows.length > 0) {
        // Update existing section
        await pool.query(
          `UPDATE sections
           SET name = $1, emoji = $2, is_active = true
           WHERE poster_storage_id = $3 AND restaurant_id = $4`,
          [storage.storage_name, emoji, storage.storage_id, restaurantId]
        );
      } else {
        // Create new section
        await pool.query(
          `INSERT INTO sections (
            restaurant_id, name, emoji, poster_storage_id, is_active
          ) VALUES ($1, $2, $3, $4, true)`,
          [restaurantId, storage.storage_name, emoji, storage.storage_id]
        );
      }
      syncedCount++;
    }

    console.log(`✅ Synced ${syncedCount} sections`);

    return NextResponse.json({
      success: true,
      data: { syncedCount },
    });
  } catch (error) {
    console.error("❌ Sync sections error:", error);
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
