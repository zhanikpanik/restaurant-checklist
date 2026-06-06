# 🔧 URGENT FIX: Database Migration Required

## Problem Found ✅

The production database is **missing the `can_send_orders` column** in the `user_sections` table!

**Error:**
```
column "can_send_orders" does not exist
```

This is why:
- Last Order card doesn't show
- Orders page doesn't work for staff users
- User permissions can't be checked

---

## Solution: Run Database Migration

### Option 1: Run Migration Script (Recommended)

**From your local machine:**

```bash
node run-user-permissions-migration.js
```

This will:
1. Connect to production database (Railway)
2. Add `can_send_orders` column
3. Add `can_receive_supplies` column
4. Verify columns were created

---

### Option 2: Manual SQL (If script doesn't work)

**Connect to Railway database:**

1. Go to https://railway.app
2. Open your project
3. Click on Postgres service
4. Click "Query" tab
5. Run this SQL:

```sql
-- Add can_send_orders column
ALTER TABLE user_sections 
ADD COLUMN IF NOT EXISTS can_send_orders BOOLEAN DEFAULT false NOT NULL;

-- Add can_receive_supplies column
ALTER TABLE user_sections 
ADD COLUMN IF NOT EXISTS can_receive_supplies BOOLEAN DEFAULT false NOT NULL;

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_sections' 
AND column_name IN ('can_send_orders', 'can_receive_supplies');
```

---

### Option 3: Railway CLI

```bash
# Connect to database
railway run --service Postgres psql

# Then run:
ALTER TABLE user_sections ADD COLUMN IF NOT EXISTS can_send_orders BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE user_sections ADD COLUMN IF NOT EXISTS can_receive_supplies BOOLEAN DEFAULT false NOT NULL;

# Verify:
\d user_sections
```

---

## After Migration

Once the migration is complete:

1. **Restart your Railway deployment:**
   - Go to Railway dashboard
   - Click your service
   - Click "Restart"

2. **Test as staff user:**
   - Go to Bar department page
   - ✅ Last Order card should now show
   - Go to `/orders` page
   - ✅ Should see orders (if assigned to section)

3. **Assign user with permissions:**
   - Login as manager
   - Go to Bar Settings → Users
   - Assign user with "Может отправлять заказы" = ON
   - ✅ Now works correctly

---

## Why This Happened

The `can_send_orders` column was added in local development, but the migration wasn't run on production yet.

**Files created:**
- `migrations/009_add_user_permissions.sql` - Migration SQL
- `run-user-permissions-migration.js` - Migration script

---

## Quick Check

**To verify migration was successful:**

```sql
-- Should return 2 rows
SELECT * FROM information_schema.columns 
WHERE table_name = 'user_sections' 
AND column_name IN ('can_send_orders', 'can_receive_supplies');
```

---

## 🚀 Next Steps

1. **Run the migration** (choose one option above)
2. **Restart Railway service**
3. **Test the app** - everything should work now!

---

**Run this ASAP and everything will work!** 🎉
