import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withoutTenant, withTenant } from "@/lib/db";
import { PosterAPI } from "@/lib/poster-api";

// POST /api/poster/sync-suppliers - Sync suppliers from Poster
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = session.user.role || "staff";
    const restaurantId = session.user.restaurantId;

    // Check permission: only admin/manager can sync
    if (!["admin", "manager"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can sync suppliers" },
        { status: 403 }
      );
    }

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
      }, { status: 400 });
    }

    // Fetch suppliers from Poster
    const posterAPI = new PosterAPI(restaurant.poster_token);
    const posterSuppliers = await posterAPI.getSuppliers();

    console.log("Fetched Poster suppliers:", posterSuppliers);

    if (!posterSuppliers || !Array.isArray(posterSuppliers)) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch suppliers from Poster",
      }, { status: 500 });
    }

    // Sync to local database
    const syncResults = await withTenant(restaurantId, async (client) => {
      const results = {
        created: 0,
        updated: 0,
        deleted: 0,
        total: posterSuppliers.length,
      };

      // First, delete old custom suppliers without poster_supplier_id
      const deleteResult = await client.query(
        `DELETE FROM suppliers WHERE restaurant_id = $1 AND poster_supplier_id IS NULL`,
        [restaurantId]
      );
      const deleted = deleteResult.rowCount || 0;
      results.deleted = deleted;

      for (const posterSupplier of posterSuppliers) {
        const posterId = Number(posterSupplier.supplier_id);
        const name = posterSupplier.supplier_name || `Supplier ${posterId}`;
        const phone = posterSupplier.supplier_phone || null;
        // Poster API has inconsistent field names - check both
        const address = posterSupplier.supplier_address || posterSupplier.supplier_adress || null;

        // Check if supplier with this poster_supplier_id already exists
        const existing = await client.query(
          `SELECT id FROM suppliers WHERE poster_supplier_id = $1 AND restaurant_id = $2`,
          [posterId, restaurantId]
        );

        if (existing.rows.length > 0) {
          // Update existing supplier
          await client.query(
            `UPDATE suppliers 
             SET name = $1, phone = $2, contact_info = $3, updated_at = CURRENT_TIMESTAMP
             WHERE poster_supplier_id = $4 AND restaurant_id = $5`,
            [name, phone, address, posterId, restaurantId]
          );
          results.updated++;
        } else {
          // Check if supplier with same name exists (link it)
          const existingByName = await client.query(
            `SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1) AND restaurant_id = $2 AND poster_supplier_id IS NULL`,
            [name, restaurantId]
          );

          if (existingByName.rows.length > 0) {
            // Link existing supplier to Poster
            await client.query(
              `UPDATE suppliers 
               SET poster_supplier_id = $1, phone = COALESCE(phone, $2), contact_info = COALESCE(contact_info, $3), updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [posterId, phone, address, existingByName.rows[0].id]
            );
            results.updated++;
          } else {
            // Create new supplier
            await client.query(
              `INSERT INTO suppliers (restaurant_id, name, phone, contact_info, poster_supplier_id)
               VALUES ($1, $2, $3, $4, $5)`,
              [restaurantId, name, phone, address, posterId]
            );
            results.created++;
          }
        }
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.total} suppliers from Poster (deleted ${syncResults.deleted} old custom suppliers)`,
      data: syncResults,
    });

  } catch (error) {
    console.error("Error syncing suppliers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET /api/poster/sync-suppliers - Get Poster suppliers (for preview)
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
        error: "Poster not configured",
      }, { status: 400 });
    }

    const posterAPI = new PosterAPI(restaurant.poster_token);
    const posterSuppliers = await posterAPI.getSuppliers();

    return NextResponse.json({
      success: true,
      data: posterSuppliers,
    });

  } catch (error) {
    console.error("Error fetching Poster suppliers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
