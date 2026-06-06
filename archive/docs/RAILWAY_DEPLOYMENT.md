# 🚂 Railway Deployment Guide - Poster Sync System

## Step 1: Run the Migration (One-Time Setup)

You need to create the database tables **once** in your Railway database.

### Option A: Run Migration Script (Recommended)

**From your local machine** (with Railway DATABASE_URL):

```bash
# Make sure you have the Railway DATABASE_URL in .env.local
node run-poster-sync-migration.js
```

This will create all 6 tables in your Railway database.

---

### Option B: Run SQL Directly

If the script doesn't work, connect to Railway database and run:

```sql
-- Copy the entire SQL from lib/poster-sync-schema.ts
-- Or use the migration below
```

**Quick Migration SQL:**

```sql
-- 1. Sync status tracking
CREATE TABLE IF NOT EXISTS poster_sync_status (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  last_sync_at TIMESTAMP,
  last_sync_success BOOLEAN DEFAULT true,
  last_sync_error TEXT,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, entity_type)
);

-- 2. Categories cache
CREATE TABLE IF NOT EXISTS poster_categories (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  poster_category_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_category_id VARCHAR(100),
  sort_order INTEGER,
  is_visible BOOLEAN DEFAULT true,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, poster_category_id)
);

-- 3. Products cache
CREATE TABLE IF NOT EXISTS poster_products (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  poster_product_id VARCHAR(100) NOT NULL,
  poster_category_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2),
  cost NUMERIC(10, 2),
  unit VARCHAR(50),
  is_visible BOOLEAN DEFAULT true,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, poster_product_id)
);

-- 4. Suppliers cache
CREATE TABLE IF NOT EXISTS poster_suppliers (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  poster_supplier_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  comment TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, poster_supplier_id)
);

-- 5. Ingredients cache
CREATE TABLE IF NOT EXISTS poster_ingredients (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  poster_ingredient_id VARCHAR(100) NOT NULL,
  poster_category_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  unit_weight NUMERIC(10, 3),
  cost NUMERIC(10, 2),
  is_visible BOOLEAN DEFAULT true,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, poster_ingredient_id)
);

-- 6. Storages cache
CREATE TABLE IF NOT EXISTS poster_storages (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  poster_storage_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, poster_storage_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poster_sync_status_restaurant ON poster_sync_status(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_poster_categories_restaurant ON poster_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_poster_products_restaurant ON poster_products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_poster_products_category ON poster_products(poster_category_id);
CREATE INDEX IF NOT EXISTS idx_poster_suppliers_restaurant ON poster_suppliers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_poster_ingredients_restaurant ON poster_ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_poster_ingredients_category ON poster_ingredients(poster_category_id);
CREATE INDEX IF NOT EXISTS idx_poster_storages_restaurant ON poster_storages(restaurant_id);
```

---

### Option C: Auto-Migrate on Deploy (Advanced)

Add to your Railway environment variables:
```
AUTO_MIGRATE=true
```

Then the tables will auto-create when the app starts.

**⚠️ Warning:** This runs on every deploy, so it's slower. Use Option A instead.

---

## Step 2: Add Environment Variables to Railway

Go to your Railway project → Variables:

```
CRON_SECRET=0a76e9c1e6aba3986680b58b03fcc0061b826642b47143596d07bafd6a6690d6
```

(Use the same value from your `.env.local`)

---

## Step 3: Deploy

```bash
git add .
git commit -m "Add Poster sync system"
git push
```

Railway will auto-deploy.

---

## Step 4: Verify Tables Created

Connect to your Railway database and check:

```sql
-- List all poster tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'poster_%'
ORDER BY table_name;

-- Should show:
-- poster_categories
-- poster_ingredients
-- poster_products
-- poster_storages
-- poster_suppliers
-- poster_sync_status
```

---

## Step 5: Test Manual Sync

Once deployed, trigger a sync:

```bash
# Replace with your Railway URL
curl -X POST https://your-app.railway.app/api/poster/sync
```

Check the response - it should sync data from Poster.

---

## Step 6: Set Up Cron Job

### For Railway (No built-in cron):

**Option A: Use an external cron service**

Use [cron-job.org](https://cron-job.org) or similar:

1. Create free account
2. Add new cron job:
   - **URL:** `https://your-app.railway.app/api/cron/sync-poster`
   - **Schedule:** Every 30 minutes (`*/30 * * * *`)
   - **Headers:** 
     ```
     Authorization: Bearer 0a76e9c1e6aba3986680b58b03fcc0061b826642b47143596d07bafd6a6690d6
     ```

**Option B: Deploy cron to Vercel**

If your main app is on Railway, you can deploy **only the cron job** to Vercel:

1. Create a minimal Next.js app with just the cron route
2. Deploy to Vercel (free cron jobs)
3. Point it to your Railway database

**Option C: Manual trigger**

Just trigger sync manually when needed:
```bash
curl -X POST https://your-app.railway.app/api/poster/sync
```

---

## Verification Checklist

After deployment:

- [ ] Tables created in Railway database
- [ ] `CRON_SECRET` set in Railway variables
- [ ] App deployed successfully
- [ ] Manual sync works (`POST /api/poster/sync`)
- [ ] Data appears in database tables
- [ ] Cron job configured (external service)

---

## Troubleshooting

### Tables not created?
```bash
# Run migration script manually
node run-poster-sync-migration.js
```

### Sync failing?
- Check Railway logs for errors
- Verify Poster access token is valid
- Check database connection

### Cron not running?
- Railway doesn't have built-in cron
- Use external service (cron-job.org)
- Or deploy cron to Vercel

---

## Next Steps

Once deployed:

1. **Monitor first sync** - Check Railway logs
2. **Verify data** - Check database tables have records
3. **Update your app** - Use cached data instead of direct Poster API calls
4. **Set up monitoring** - Track sync success/failures

---

**Need help?** Check `POSTER_SYNC_GUIDE.md` for detailed documentation.
