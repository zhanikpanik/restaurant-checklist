# Poster Data Synchronization System

## Overview

This system automatically syncs data from Poster POS to your local database, enabling fast loading times and offline capability.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Poster API │ ───▶ │  Sync Service │ ───▶ │  PostgreSQL │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Your App    │
                     │  (Fast Load) │
                     └──────────────┘
```

## Features

✅ **Automatic Background Sync** - Runs every 30 minutes via cron job
✅ **Manual Sync** - Users can trigger sync anytime
✅ **Selective Sync** - Sync specific entities (categories, products, etc.)
✅ **Sync Status Tracking** - Know when data was last synced
✅ **Error Handling** - Tracks sync failures and retries
✅ **Multi-Restaurant** - Each restaurant syncs independently

## Data Synced

1. **Categories** - Product categories from Poster
2. **Products** - Menu products
3. **Suppliers** - Supplier information
4. **Ingredients** - Storage/inventory items
5. **Storages** - Storage locations

## How It Works

### 1. Initial Sync (First Time)
When a restaurant connects their Poster account:
```javascript
const syncService = await createSyncService(restaurantId);
await syncService.syncAll(); // Fetches all data
```

### 2. Background Sync (Automatic)
Vercel Cron runs `/api/cron/sync-poster` every 30 minutes:
- Checks all active restaurants
- Syncs if >30 minutes since last sync
- Logs results

### 3. Manual Sync (User-Triggered)
Users can trigger sync from the admin panel:
```javascript
POST /api/poster/sync
{
  "entities": ["products", "categories"] // Optional: selective sync
}
```

### 4. Data Storage
Data is cached in these tables:
- `poster_categories`
- `poster_products`
- `poster_suppliers`
- `poster_ingredients`
- `poster_storages`
- `poster_sync_status` (tracks sync state)

## API Endpoints

### GET /api/poster/sync
Get sync status for current restaurant

**Response:**
```json
{
  "restaurantId": "rest_123",
  "status": {
    "products": {
      "lastSyncAt": "2024-02-09T15:30:00Z",
      "needsSync": false,
      "age": 15
    },
    ...
  }
}
```

### POST /api/poster/sync
Trigger manual sync

**Request:**
```json
{
  "entities": ["products", "categories"] // Optional
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "categories": 25,
    "products": 150,
    "suppliers": 10,
    "ingredients": 200,
    "storages": 3
  },
  "syncedAt": "2024-02-09T15:30:00Z"
}
```

### GET /api/cron/sync-poster
Background cron job (internal use)

**Authorization:** Requires `CRON_SECRET` in Authorization header

## Setup Instructions

### 1. Database Setup
Run the schema setup (automatic in development):
```bash
npm run dev  # Auto-runs schema setup
```

### 2. Environment Variables
Add to `.env.local`:
```env
CRON_SECRET=your_random_secret_here
```

### 3. Vercel Deployment
The cron job is configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-poster",
    "schedule": "*/30 * * * *"
  }]
}
```

### 4. Protect Cron Endpoint
In Vercel dashboard:
1. Go to Environment Variables
2. Add `CRON_SECRET` with a random value
3. Cron job will auto-include this in requests

## Using Synced Data

Instead of calling Poster API directly:

### ❌ Before (Slow)
```javascript
// Every request waits for Poster API
const products = await posterAPI.getProducts();
```

### ✅ After (Fast)
```javascript
// Read from local database (instant)
const products = await pool.query(`
  SELECT * FROM poster_products 
  WHERE restaurant_id = $1 AND is_visible = true
`, [restaurantId]);
```

## Monitoring

### Check Sync Status
```sql
SELECT * FROM poster_sync_status 
WHERE restaurant_id = 'your_restaurant_id';
```

### View Cached Data
```sql
-- Products
SELECT COUNT(*) FROM poster_products WHERE restaurant_id = 'your_id';

-- Categories
SELECT COUNT(*) FROM poster_categories WHERE restaurant_id = 'your_id';

-- Suppliers
SELECT COUNT(*) FROM poster_suppliers WHERE restaurant_id = 'your_id';
```

## Troubleshooting

### Sync Failing
1. Check `poster_sync_status` table for error messages
2. Verify Poster access token is valid
3. Check Vercel logs for cron job execution

### Data Not Updating
1. Check last sync time in `poster_sync_status`
2. Manually trigger sync via API or UI
3. Verify cron job is running (Vercel → Deployments → Cron Jobs)

### Cron Not Running
1. Ensure `vercel.json` is in project root
2. Check Vercel project settings → Cron Jobs
3. Verify `CRON_SECRET` is set in environment variables

## Performance

- **Initial sync**: ~10-30 seconds (depending on data size)
- **Background sync**: Runs in background, doesn't block users
- **API response time**: <100ms (reading from database vs 1-3s from Poster API)

## Future Enhancements

- [ ] Webhook support for real-time updates
- [ ] Delta sync (only changed records)
- [ ] Conflict resolution for manual edits
- [ ] Sync history and rollback
- [ ] Configurable sync intervals per restaurant
- [ ] Real-time sync status notifications

## Related Files

- `lib/poster-sync-schema.ts` - Database schema
- `lib/poster-sync-service.ts` - Sync logic
- `app/api/poster/sync/route.ts` - Manual sync API
- `app/api/cron/sync-poster/route.ts` - Background cron job
- `components/PosterSyncPanel.tsx` - Admin UI
- `vercel.json` - Cron configuration
