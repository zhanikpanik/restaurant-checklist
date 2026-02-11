# Poster POS Integration Guide

Complete guide for Poster POS system integration with real-time webhooks and automated sync.

---

## 🎯 Overview

This app integrates with Poster POS to automatically sync:
- **Suppliers** (поставщики)
- **Ingredients** (ингредиенты/товары)
- **Storages** (склады)
- **Categories** (категории)

---

## 🔄 Sync Architecture

### Three-Layer Sync System:

```
┌──────────────────────────────────────────────┐
│  1. WEBHOOKS (Real-Time)                     │
│  ✓ Instant updates when data changes         │
│  ✓ Lowest latency (~1-2 seconds)            │
│  ✓ Most efficient                            │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  2. MANUAL SYNC (User-Triggered)             │
│  ✓ Smart sync - only if > 24 hours old      │
│  ✓ Force sync - always downloads fresh data │
│  ✓ Fallback if webhooks fail                │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  3. CRON JOB (Daily Backup)                  │
│  ✓ Runs daily at 3 AM                       │
│  ✓ Safety net for missed webhooks           │
│  ✓ Ensures data consistency                 │
└──────────────────────────────────────────────┘
```

---

## 📋 Setup Instructions

### 1. Configure Poster API Credentials

Add to `.env.local`:

```bash
# Poster OAuth Credentials
POSTER_APP_ID=your_app_id
POSTER_APP_SECRET=your_app_secret
POSTER_REDIRECT_URI=https://your-domain.com/api/poster/oauth/callback

# Optional: Poster Access Token (for testing)
POSTER_ACCESS_TOKEN=your_access_token
```

### 2. Set Up Webhooks in Poster Dashboard

1. Go to Poster Dashboard → Settings → API → Webhooks
2. Add webhook URL: `https://your-domain.com/api/poster/webhooks`
3. Select events:
   - `product.added` - New ingredient created
   - `product.changed` - Ingredient updated
   - `product.removed` - Ingredient deleted
   - `supplier.added` - New supplier created
   - `supplier.changed` - Supplier updated
   - `supplier.removed` - Supplier deleted
   - `storage.added` - New storage created
   - `storage.changed` - Storage updated

4. Save webhook configuration

### 3. Run Database Migration

```bash
# Apply webhook logs table
psql $DATABASE_URL -f migrations/008_webhook_logs.sql
```

---

## 🚀 Usage

### Via UI (Recommended)

1. Go to **Suppliers & Categories** page (`/suppliers-categories`)
2. Click **⚙️ Poster Sync Settings** to expand panel
3. View sync status for each entity
4. Click sync buttons:
   - **Smart Sync**: Only syncs if data is > 24 hours old
   - **Force Sync**: Always downloads fresh data (ignores cache)

### Via API

#### Smart Sync (Respects 24-hour cache)
```bash
curl -X POST https://your-domain.com/api/poster/sync \
  -H "Content-Type: application/json" \
  -d '{"entities": ["suppliers", "ingredients"]}'
```

#### Force Sync (Ignores cache)
```bash
curl -X POST https://your-domain.com/api/poster/sync \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

#### Get Sync Status
```bash
curl https://your-domain.com/api/poster/sync
```

Response:
```json
{
  "status": {
    "suppliers": {
      "lastSyncAt": "2024-02-10T14:00:00Z",
      "needsSync": false,
      "age": 30
    },
    "ingredients": {
      "lastSyncAt": "2024-02-10T13:00:00Z",
      "needsSync": true,
      "age": 90
    }
  }
}
```

---

## 🔔 Webhook Flow

### Example: New Ingredient Created in Poster

```
1. Manager creates "Молоко 3.2%" in Poster POS
   ↓
2. Poster sends webhook to your app:
   POST /api/poster/webhooks
   {
     "account_id": "123456",
     "object": "product",
     "object_id": "789",
     "action": "added"
   }
   ↓
3. App identifies restaurant by account_id
   ↓
4. Syncs ONLY that ingredient (not full sync)
   ↓
5. Database updated in ~2 seconds
   ↓
6. Users see new ingredient immediately
```

---

## 📊 Database Tables

### `poster_sync_status`
Tracks last sync time for each entity type:

```sql
SELECT * FROM poster_sync_status;

restaurant_id | entity_type  | last_sync_at        | last_sync_success
------------- | ------------ | ------------------- | -----------------
rest_123      | suppliers    | 2024-02-10 14:00:00 | true
rest_123      | ingredients  | 2024-02-10 14:00:05 | true
```

### `webhook_logs`
Logs all received webhooks:

```sql
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;

id  | restaurant_id | object_type | action  | created_at
--- | ------------- | ----------- | ------- | -------------------
1   | rest_123      | product     | added   | 2024-02-10 14:05:00
2   | rest_123      | supplier    | changed | 2024-02-10 13:30:00
```

---

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/poster/sync` | GET | Get sync status |
| `/api/poster/sync` | POST | Trigger sync (smart or force) |
| `/api/poster/sync-suppliers` | POST | Sync only suppliers |
| `/api/sync-ingredients` | POST | Sync only ingredients |
| `/api/sync-sections` | POST | Sync sections/departments |
| `/api/poster/webhooks` | POST | Webhook receiver (for Poster) |
| `/api/cron/sync-poster` | GET | Daily cron job (3 AM) |

---

## 📈 Performance Benefits

### Before (Hourly Cron Only)
- **API Calls**: 72 per day (24 hours × 3 entities)
- **Data Freshness**: Up to 1 hour old
- **Server Load**: High (constant polling)
- **Cost**: Medium-High

### After (Webhooks + Daily Cron)
- **API Calls**: ~10-15 per day (only when changes occur)
- **Data Freshness**: Real-time (1-2 seconds)
- **Server Load**: Very Low (event-driven)
- **Cost**: Very Low

**Savings**: ~80% reduction in API calls and server load

---

## 🔍 Monitoring & Debugging

### View Webhook Logs
```sql
-- Recent webhooks
SELECT 
  created_at,
  object_type,
  action,
  payload->>'object_id' as object_id
FROM webhook_logs
WHERE restaurant_id = 'your_restaurant_id'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Sync Status
```sql
-- See when each entity was last synced
SELECT 
  entity_type,
  last_sync_at,
  last_sync_success,
  sync_count,
  last_sync_error
FROM poster_sync_status
WHERE restaurant_id = 'your_restaurant_id';
```

### Test Webhook Manually
```bash
curl -X POST http://localhost:3000/api/poster/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "your_account_id",
    "object": "product",
    "object_id": "123",
    "action": "added",
    "time": 1707577200
  }'
```

---

## 🚨 Troubleshooting

### Webhooks Not Working?

1. **Check webhook URL is publicly accessible**
   ```bash
   curl https://your-domain.com/api/poster/webhooks
   # Should return: {"status":"ok"}
   ```

2. **Verify Poster webhook configuration**
   - Go to Poster Dashboard → API → Webhooks
   - Check URL is correct
   - Ensure events are selected

3. **Check webhook logs**
   ```sql
   SELECT * FROM webhook_logs 
   WHERE restaurant_id = 'your_id' 
   ORDER BY created_at DESC;
   ```

4. **Use manual sync as fallback**
   - Click "Force Sync" in UI
   - Or use API: `POST /api/poster/sync` with `{"force": true}`

### Data Not Syncing?

1. **Check Poster token is valid**
   ```sql
   SELECT * FROM poster_tokens 
   WHERE restaurant_id = 'your_id' 
   AND is_active = true;
   ```

2. **Run manual sync**
   - UI: Click "Force Sync All"
   - API: `POST /api/poster/sync` with `{"force": true}`

3. **Check sync errors**
   ```sql
   SELECT * FROM poster_sync_status
   WHERE last_sync_success = false;
   ```

---

## 🔐 Security Notes

- Webhooks should verify signature (TODO: implement `x-poster-signature` check)
- Access tokens stored encrypted in database
- OAuth flow uses secure state parameter
- API endpoints protected with authentication middleware

---

## 📚 Related Files

```
lib/
  ├── poster-api.ts              # Poster API client
  ├── poster-sync-service.ts     # Sync logic & single-item sync
  └── db.ts                       # Database connection

app/api/
  ├── poster/
  │   ├── sync/route.ts          # Main sync endpoint
  │   ├── sync-suppliers/route.ts
  │   ├── webhooks/route.ts      # Webhook receiver
  │   └── oauth/
  │       ├── authorize/route.ts
  │       └── callback/route.ts
  ├── sync-ingredients/route.ts
  ├── sync-sections/route.ts
  └── cron/
      └── sync-poster/route.ts   # Daily cron job

components/
  └── poster/
      └── PosterSyncPanel.tsx    # UI for sync control

migrations/
  └── 008_webhook_logs.sql       # Webhook logs table

vercel.json                      # Cron job configuration (daily 3 AM)
```

---

## 🎓 FAQ

**Q: How often does data sync?**  
A: Real-time via webhooks (1-2 seconds) + daily backup at 3 AM

**Q: What if webhooks fail?**  
A: Manual sync buttons available + daily cron as safety net

**Q: Can I force a fresh sync?**  
A: Yes! Click "Force Sync" button or use API with `{"force": true}`

**Q: How much does this cost in API calls?**  
A: ~10-15 calls/day (vs 72 with hourly cron) = 80% savings

**Q: Can I sync specific entities only?**  
A: Yes! Use API: `POST /api/poster/sync` with `{"entities": ["suppliers"]}`

---

## 📝 Next Steps

- [ ] Add webhook signature verification
- [ ] Add retry logic for failed webhook processing
- [ ] Create admin dashboard for sync monitoring
- [ ] Add email alerts for sync failures
- [ ] Implement rate limiting for manual syncs

---

**Last Updated**: February 10, 2024  
**Version**: 2.0 (Webhook Integration)
