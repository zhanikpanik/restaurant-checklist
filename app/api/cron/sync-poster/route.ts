import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { PosterSyncService, getPosterAccessToken } from "@/lib/poster-sync-service";

/**
 * GET /api/cron/sync-poster
 * 
 * Background job to sync all active restaurants with Poster
 * 
 * This should be called periodically (e.g., every 30 minutes) by:
 * - Vercel Cron Jobs
 * - Railway Cron Jobs
 * - External cron services (cron-job.org)
 * 
 * Authorization: Requires CRON_SECRET env var for security
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid cron secret" },
        { status: 401 }
      );
    }

    if (!pool) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 }
      );
    }

    console.log("🔄 Starting background Poster sync for all restaurants...");

    // Get all active restaurants with Poster tokens
    const result = await pool.query(`
      SELECT DISTINCT r.id, r.name, pt.access_token
      FROM restaurants r
      INNER JOIN poster_tokens pt ON r.id = pt.restaurant_id
      WHERE r.is_active = true AND pt.is_active = true
      ORDER BY r.id
    `);

    const restaurants = result.rows;
    console.log(`Found ${restaurants.length} restaurants to sync`);

    const syncResults = [];

    // Sync each restaurant
    for (const restaurant of restaurants) {
      try {
        console.log(`\n🏪 Syncing restaurant: ${restaurant.name} (${restaurant.id})`);
        
        const syncService = new PosterSyncService(restaurant.id, restaurant.access_token);
        
        // Check if sync is needed (only sync if >30 minutes since last sync)
        const needsSync = await syncService.needsSync('products', 30);
        
        if (!needsSync) {
          console.log(`⏭️  Skipping ${restaurant.name} - synced recently`);
          syncResults.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            skipped: true,
            reason: "Recently synced",
          });
          continue;
        }

        // Perform full sync
        const results = await syncService.syncAll();
        
        syncResults.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          success: true,
          results,
        });

      } catch (error) {
        console.error(`❌ Failed to sync ${restaurant.name}:`, error);
        
        syncResults.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => r.success === false).length;
    const skipCount = syncResults.filter(r => r.skipped).length;

    console.log(`\n✅ Background sync complete: ${successCount} succeeded, ${failCount} failed, ${skipCount} skipped`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalRestaurants: restaurants.length,
      successCount,
      failCount,
      skipCount,
      results: syncResults,
    });

  } catch (error) {
    console.error("Background sync error:", error);
    
    return NextResponse.json(
      {
        error: "Background sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
