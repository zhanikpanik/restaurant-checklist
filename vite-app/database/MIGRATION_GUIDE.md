# Data Model Simplification: Categories Removed

## Summary
Changed from a 3-tier structure to a 2-tier structure for better simplicity:

**Old:** `Ingredients → Categories → Suppliers`  
**New:** `Ingredients → Suppliers` (direct link)

---

## Changes Made

### 1. Database Schema
- **Added** `supplier_id` column directly to `section_products` table
- **Migrated** existing supplier links from categories to products
- **Kept** `category_id` column (optional, for organizational purposes)
- **Created** index on `supplier_id` for better query performance

### 2. Backend API (`vite-app/server/routes/products.ts`)
- **Updated** GET endpoint to fetch `supplier_id` directly from products
- **Updated** POST endpoint to accept `supplier_id` when creating products
- **Updated** PATCH endpoint to allow updating `supplier_id`
- **Changed** SQL joins to link suppliers directly instead of through categories

### 3. TypeScript Types (`vite-app/src/types/index.ts`)
- **Updated** `SectionProduct` interface to include `supplier_id`
- Types now reflect the direct ingredient-to-supplier relationship

### 4. Manager Page
- **Disabled** `/manager` route (no longer accessible)
- **Removed** navigation links to Manager page
- **Kept** `/orders` page functional for order management

---

## How to Run Migration

### Option 1: Using the script (Recommended)
```bash
cd vite-app/database
./run-migration.sh
```

### Option 2: Manual SQL
```bash
psql $DATABASE_URL -f vite-app/database/migrations/add_supplier_to_products.sql
```

### Option 3: From psql prompt
```sql
\i vite-app/database/migrations/add_supplier_to_products.sql
```

---

## What This Means

### Before Migration:
```
Product → Category → Supplier
   ↓         ↓          ↓
  ID: 1   ID: 5     ID: 2
  Name    Name      Name
          category_id  supplier_id
```

### After Migration:
```
Product → Supplier (direct)
   ↓          ↓
  ID: 1    ID: 2
  Name     Name
  supplier_id
```

---

## Benefits

1. **Simpler** - One less table to manage in the relationship
2. **Faster** - Fewer SQL joins needed to get supplier info
3. **Clearer** - Direct relationship is more intuitive
4. **Flexible** - Categories can still be used optionally for organization

---

## Notes

- **Categories table** is NOT deleted (in case you want to use it later)
- **Existing data** is automatically migrated
- **category_id** field is still available but optional
- If you want to completely remove categories, uncomment the DROP statements in the migration file

---

## Testing After Migration

1. Restart your server: `npm run dev`
2. Check that products show supplier information
3. Create a new product and assign it directly to a supplier
4. Verify the supplier link works when creating Poster supplies
