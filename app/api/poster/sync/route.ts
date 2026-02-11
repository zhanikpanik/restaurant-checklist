import { NextRequest, NextResponse } from "next/server";
import { createSyncService } from "@/lib/poster-sync-service";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/poster/sync
 * Trigger a full sync of Poster data
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }

    const { restaurantId } = authResult;

    // Parse request body for selective sync and force flag
    let body: { entities?: string[]; force?: boolean } | null = null;
    try {
      body = await request.json();
    } catch {
      // No body is fine, will sync all
    }

    const entities = body?.entities;
    const force = body?.force || false;

    // Create sync service
    const syncService = await createSyncService(restaurantId);

    let results: Record<string, number> = {};

    if (entities && Array.isArray(entities)) {
      // Selective sync
      for (const entity of entities) {
        // Check if sync needed (unless force flag is set)
        const shouldSync = force || await syncService.shouldSync(entity);
        
        if (!shouldSync) {
          console.log(`⏭️ Skipping ${entity} sync (recently synced)`);
          results[entity] = 0;
          continue;
        }

        switch (entity) {
          case 'categories':
            results.categories = await syncService.syncCategories();
            break;
          case 'products':
            results.products = await syncService.syncProducts();
            break;
          case 'suppliers':
            results.suppliers = await syncService.syncSuppliers();
            break;
          case 'ingredients':
            results.ingredients = await syncService.syncIngredients();
            break;
          case 'storages':
            results.storages = await syncService.syncStorages();
            break;
          default:
            console.warn(`Unknown entity type: ${entity}`);
        }
      }
    } else {
      // Full sync
      if (force) {
        console.log('🔄 Force syncing all entities...');
        results = await syncService.forceSyncAll();
      } else {
        results = await syncService.syncAll();
      }
    }

    return NextResponse.json({
      success: true,
      restaurantId,
      results,
      forced: force,
      syncedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Sync error:", error);
    
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/poster/sync
 * Get sync status for the current restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { restaurantId } = authResult;
    const syncService = await createSyncService(restaurantId);

    const entities = ['categories', 'products', 'suppliers', 'ingredients', 'storages'];
    const status: Record<string, any> = {};

    for (const entity of entities) {
      const lastSync = await syncService.getLastSyncTime(entity);
      const needsSync = await syncService.needsSync(entity, 30);

      status[entity] = {
        lastSyncAt: lastSync?.toISOString() || null,
        needsSync,
        age: lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 1000 / 60) : null,
      };
    }

    return NextResponse.json({
      restaurantId,
      status,
    });

  } catch (error) {
    console.error("Get sync status error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to get sync status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
