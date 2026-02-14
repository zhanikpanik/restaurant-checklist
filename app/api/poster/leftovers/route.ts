import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withoutTenant } from "@/lib/db";
import { PosterAPI } from "@/lib/poster-api";

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

    // Fetch leftovers
    let leftovers: any[] = [];
    let debugItem: any = null;
    
    try {
      // According to docs, calling without storage_id returns ALL storages
      // Let's try that first as it's more efficient and safer
      console.log("[Leftovers API] Fetching all leftovers (no storage_id)...");
      
      // We'll use the generic request method to call it without params
      const allLeftovers = await posterAPI.request('/storage.getStorageLeftovers');
      
      if (Array.isArray(allLeftovers)) {
        console.log(`[Leftovers API] Got ${allLeftovers.length} items directly`);
        leftovers = allLeftovers;
        if (leftovers.length > 0) debugItem = leftovers[0];
      } else {
        // Fallback to iterating storages if the global call fails or returns empty object
        console.log("[Leftovers API] Global call returned non-array, trying per-storage...");
        
        const storages = await posterAPI.getStorages();
        const promises = storages.map(storage => 
          posterAPI.getStorageLeftovers(Number(storage.storage_id))
            .then(data => data || [])
            .catch(e => {
              console.warn(`[Leftovers API] Failed for storage ${storage.storage_id}:`, e);
              return [];
            })
        );
        const results = await Promise.all(promises);
        leftovers = results.flat();
      }
      
    } catch (e) {
      console.error("[Leftovers API] Failed to fetch leftovers:", e);
    }

    // Aggregate by ingredient_id
    const stockMap: Record<string, number> = {};
    
    if (Array.isArray(leftovers)) {
      leftovers.forEach((item: any) => {
        const id = String(item.ingredient_id);
        
        let qty = 0;
        // Try 'ingredient_left' field (as seen in debug) or 'leftover'
        let val = item.ingredient_left !== undefined ? item.ingredient_left : item.leftover;
        
        if (val !== undefined) {
           if (typeof val === 'string') val = val.replace(',', '.');
           qty = Number(val);
        }

        if (!isNaN(qty)) {
          stockMap[id] = (stockMap[id] || 0) + qty;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: stockMap,
      debug: debugItem // Send one raw item for inspection
    });
  } catch (error) {
    console.error("Error fetching Poster leftovers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
