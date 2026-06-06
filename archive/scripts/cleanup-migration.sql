-- =====================================================
-- COMPREHENSIVE DATABASE CLEANUP MIGRATION
-- Run with: node scripts/run-cleanup-migration.js
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CLEAN UP TEST RESTAURANTS
-- =====================================================

-- First, let's see what will be deleted (for safety)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Restaurants to be deleted:';
  FOR r IN SELECT id, name FROM restaurants WHERE id IN ('asdasd', 'default') LOOP
    RAISE NOTICE '  - % (%)', r.id, r.name;
  END LOOP;
END $$;

-- Delete test restaurants (cascades to all related data)
DELETE FROM restaurants WHERE id IN ('asdasd', 'default');

-- =====================================================
-- 2. FIX NULLABLE COLUMNS
-- =====================================================

-- Update any NULL restaurant_ids to a valid restaurant before adding NOT NULL
-- (Safety: in case there's orphaned data)
UPDATE product_categories 
SET restaurant_id = (SELECT id FROM restaurants LIMIT 1)
WHERE restaurant_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE product_categories 
ALTER COLUMN restaurant_id SET NOT NULL;

-- Remove the default value (force explicit restaurant assignment)
ALTER TABLE product_categories 
ALTER COLUMN restaurant_id DROP DEFAULT;

-- =====================================================
-- 3. DROP UNUSED PRODUCTS TABLE (if exists)
-- =====================================================

-- Only check if table exists, then verify empty and drop
DO $$
DECLARE
  cnt INTEGER;
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'products'
  ) INTO table_exists;
  
  IF table_exists THEN
    SELECT COUNT(*) INTO cnt FROM products;
    IF cnt > 0 THEN
      RAISE EXCEPTION 'products table has % rows - aborting drop!', cnt;
    END IF;
    RAISE NOTICE 'products table is empty, dropping...';
    DROP TABLE products CASCADE;
  ELSE
    RAISE NOTICE 'products table already dropped, skipping';
  END IF;
END $$;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tenant tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_leftovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE poster_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- SUPPLIERS
DROP POLICY IF EXISTS suppliers_tenant_isolation ON suppliers;
CREATE POLICY suppliers_tenant_isolation ON suppliers
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- PRODUCT_CATEGORIES
DROP POLICY IF EXISTS product_categories_tenant_isolation ON product_categories;
CREATE POLICY product_categories_tenant_isolation ON product_categories
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- SECTIONS
DROP POLICY IF EXISTS sections_tenant_isolation ON sections;
CREATE POLICY sections_tenant_isolation ON sections
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- SECTION_PRODUCTS (via sections relationship)
DROP POLICY IF EXISTS section_products_tenant_isolation ON section_products;
CREATE POLICY section_products_tenant_isolation ON section_products
    FOR ALL
    USING (
        section_id IN (
            SELECT id FROM sections
            WHERE restaurant_id = current_setting('app.current_tenant', TRUE)
        )
    )
    WITH CHECK (
        section_id IN (
            SELECT id FROM sections
            WHERE restaurant_id = current_setting('app.current_tenant', TRUE)
        )
    );

-- SECTION_LEFTOVERS (via section_products -> sections)
DROP POLICY IF EXISTS section_leftovers_tenant_isolation ON section_leftovers;
CREATE POLICY section_leftovers_tenant_isolation ON section_leftovers
    FOR ALL
    USING (
        section_id IN (
            SELECT id FROM sections
            WHERE restaurant_id = current_setting('app.current_tenant', TRUE)
        )
    )
    WITH CHECK (
        section_id IN (
            SELECT id FROM sections
            WHERE restaurant_id = current_setting('app.current_tenant', TRUE)
        )
    );

-- ORDERS
DROP POLICY IF EXISTS orders_tenant_isolation ON orders;
CREATE POLICY orders_tenant_isolation ON orders
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- CUSTOM_PRODUCTS
DROP POLICY IF EXISTS custom_products_tenant_isolation ON custom_products;
CREATE POLICY custom_products_tenant_isolation ON custom_products
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- DEPARTMENTS
DROP POLICY IF EXISTS departments_tenant_isolation ON departments;
CREATE POLICY departments_tenant_isolation ON departments
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- POSTER_TOKENS
DROP POLICY IF EXISTS poster_tokens_tenant_isolation ON poster_tokens;
CREATE POLICY poster_tokens_tenant_isolation ON poster_tokens
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- USERS (can see own restaurant's users)
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (restaurant_id = current_setting('app.current_tenant', TRUE) 
           OR restaurant_id IS NULL)  -- Allow super-admins with NULL restaurant
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE)
                OR restaurant_id IS NULL);

-- =====================================================
-- 6. ADD MISSING updated_at COLUMNS
-- =====================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE section_leftovers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- product_categories might already have it with different type, handle carefully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- =====================================================
-- 7. VERIFY CHANGES
-- =====================================================

-- Check RLS status
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('suppliers', 'product_categories', 'sections', 'section_products', 
                    'section_leftovers', 'orders', 'custom_products', 'departments', 
                    'poster_tokens', 'users')
ORDER BY tablename;

-- Check remaining restaurants
SELECT id, name, is_active FROM restaurants ORDER BY id;

-- Check policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

COMMIT;

-- =====================================================
-- IMPORTANT: APPLICATION CODE CHANGES REQUIRED
-- =====================================================
-- 
-- After running this migration, you MUST update your API code to set
-- the tenant at the start of each request:
--
--   const client = await pool.connect();
--   try {
--     await client.query('SET LOCAL app.current_tenant = $1', [restaurantId]);
--     // ... rest of your queries
--   } finally {
--     client.release();
--   }
--
-- See lib/db.ts for the withTenant() helper function.
-- =====================================================
