import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { PosterSyncService } from "@/lib/poster-sync-service";

/**
 * Poster Webhook Handler
 * Receives real-time updates from Poster POS system
 * 
 * Webhook types from Poster:
 * - product: ingredient changes (added/changed/removed)
 * - supplier: supplier changes
 * - storage: storage/warehouse changes
 */

interface PosterWebhook {
  account: string;        // Poster account name
  account_id: string;     // Poster account ID
  object: string;         // Type: product, supplier, storage, etc.
  object_id: string;      // ID of changed object
  action: string;         // Action: added, changed, removed
  time: number;           // Unix timestamp
  verify: string;         // Signature for verification
}

export async function POST(req: NextRequest) {
  try {
    if (!pool) {
      console.error('❌ Database pool not initialized');
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const webhook: PosterWebhook = await req.json();
    
    console.log('📥 Received Poster webhook:', {
      account: webhook.account,
      object: webhook.object,
      action: webhook.action,
      object_id: webhook.object_id,
    });

    // Find restaurant by Poster account ID
    const restaurantResult = await pool.query(
      `SELECT r.id, pt.access_token 
       FROM restaurants r
       JOIN poster_tokens pt ON pt.restaurant_id = r.id
       WHERE pt.account_id = $1 AND pt.is_active = true
       ORDER BY pt.created_at DESC
       LIMIT 1`,
      [webhook.account_id]
    );

    if (restaurantResult.rows.length === 0) {
      console.error(`❌ Restaurant not found for Poster account: ${webhook.account_id}`);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const { id: restaurantId, access_token } = restaurantResult.rows[0];
    const syncService = new PosterSyncService(restaurantId, access_token);

    // Handle different webhook types
    switch (webhook.object) {
      case 'product':
        // In Poster, "product" can mean menu items or ingredients
        // We're interested in ingredients (storage products)
        await handleProductWebhook(syncService, webhook);
        break;

      case 'supplier':
        await handleSupplierWebhook(syncService, webhook);
        break;

      case 'storage':
        await handleStorageWebhook(syncService, webhook);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook type: ${webhook.object}`);
    }

    // Log webhook receipt
    await pool.query(
      `INSERT INTO webhook_logs 
       (restaurant_id, webhook_type, object_type, object_id, action, payload, created_at)
       VALUES ($1, 'poster', $2, $3, $4, $5, NOW())`,
      [
        restaurantId,
        webhook.object,
        webhook.object_id,
        webhook.action,
        JSON.stringify(webhook),
      ]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleProductWebhook(
  syncService: PosterSyncService,
  webhook: PosterWebhook
) {
  const ingredientId = webhook.object_id;

  switch (webhook.action) {
    case 'added':
    case 'changed':
      console.log(`🔄 Syncing ingredient: ${ingredientId}`);
      await syncService.syncSingleIngredient(ingredientId);
      break;

    case 'removed':
      console.log(`🗑️ Removing ingredient: ${ingredientId}`);
      await syncService.syncSingleIngredient(ingredientId); // Will delete if not found
      break;

    default:
      console.log(`ℹ️ Unhandled product action: ${webhook.action}`);
  }
}

async function handleSupplierWebhook(
  syncService: PosterSyncService,
  webhook: PosterWebhook
) {
  const supplierId = parseInt(webhook.object_id, 10);

  switch (webhook.action) {
    case 'added':
    case 'changed':
      console.log(`🔄 Syncing supplier: ${supplierId}`);
      await syncService.syncSingleSupplier(supplierId);
      break;

    case 'removed':
      console.log(`🗑️ Removing supplier: ${supplierId}`);
      await syncService.syncSingleSupplier(supplierId); // Will delete if not found
      break;

    default:
      console.log(`ℹ️ Unhandled supplier action: ${webhook.action}`);
  }
}

async function handleStorageWebhook(
  syncService: PosterSyncService,
  webhook: PosterWebhook
) {
  // For storage changes, do a full storage sync
  // (Usually storages don't change often)
  console.log(`🔄 Storage ${webhook.action}, syncing all storages`);
  await syncService.syncStorages();
}

// Allow GET for webhook verification (some services require this)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'Poster Webhook Handler',
  });
}
