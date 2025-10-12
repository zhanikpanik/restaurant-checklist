-- =====================================================
-- ROW-LEVEL SECURITY (RLS) IMPLEMENTATION
-- Automatically enforce tenant isolation at database level
-- =====================================================

-- This script implements PostgreSQL Row-Level Security to automatically
-- filter data by restaurant_id without requiring application-level WHERE clauses.
-- This prevents accidental data leaks and simplifies query logic.

BEGIN;

-- =====================================================
-- 1. ENABLE RLS ON ALL TENANT TABLES
-- =====================================================

-- Enable RLS on tables with restaurant_id
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Note: We don't enable RLS on the 'restaurants' table itself
-- as we need to query across all restaurants for admin purposes

-- =====================================================
-- 2. CREATE SECURITY POLICIES
-- =====================================================

-- The idea: Each policy checks if the row's restaurant_id matches
-- the current session's app.current_tenant setting.

-- We'll use PostgreSQL's current_setting() to get the tenant ID
-- that must be set by the application at the start of each request.

-- SUPPLIERS TABLE
DROP POLICY IF EXISTS suppliers_tenant_isolation ON suppliers;
CREATE POLICY suppliers_tenant_isolation ON suppliers
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- PRODUCT_CATEGORIES TABLE
DROP POLICY IF EXISTS product_categories_tenant_isolation ON product_categories;
CREATE POLICY product_categories_tenant_isolation ON product_categories
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- SECTIONS TABLE
DROP POLICY IF EXISTS sections_tenant_isolation ON sections;
CREATE POLICY sections_tenant_isolation ON sections
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- SECTION_PRODUCTS TABLE (via sections relationship)
DROP POLICY IF EXISTS section_products_tenant_isolation ON section_products;
CREATE POLICY section_products_tenant_isolation ON section_products
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

-- ORDERS TABLE
DROP POLICY IF EXISTS orders_tenant_isolation ON orders;
CREATE POLICY orders_tenant_isolation ON orders
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- PRODUCTS TABLE
DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_tenant_isolation ON products
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- CUSTOM_PRODUCTS TABLE
DROP POLICY IF EXISTS custom_products_tenant_isolation ON custom_products;
CREATE POLICY custom_products_tenant_isolation ON custom_products
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- DEPARTMENTS TABLE
DROP POLICY IF EXISTS departments_tenant_isolation ON departments;
CREATE POLICY departments_tenant_isolation ON departments
    USING (restaurant_id = current_setting('app.current_tenant', TRUE))
    WITH CHECK (restaurant_id = current_setting('app.current_tenant', TRUE));

-- =====================================================
-- 3. VERIFY POLICIES
-- =====================================================

-- Check which tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'suppliers', 'product_categories', 'sections', 'section_products',
        'orders', 'products', 'custom_products', 'departments'
    )
ORDER BY tablename;

-- Check policies created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMIT;

-- =====================================================
-- TESTING RLS
-- =====================================================

-- To test RLS, you need to set the tenant in your session:
-- SET app.current_tenant = 'default';
-- SELECT * FROM suppliers; -- Only shows suppliers for 'default' tenant

-- SET app.current_tenant = '245580';
-- SELECT * FROM suppliers; -- Only shows suppliers for '245580' tenant

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

-- 1. Application must set current_tenant at start of each request:
--    await client.query("SET LOCAL app.current_tenant = $1", [tenantId]);
--
-- 2. Use SET LOCAL (not SET) so it only applies to current transaction
--
-- 3. If app.current_tenant is not set, queries return NO rows (safe default)
--
-- 4. Superuser/owner roles bypass RLS by default
--    For testing, create a non-superuser role
--
-- 5. RLS applies to ALL queries: SELECT, INSERT, UPDATE, DELETE
--    No need to add WHERE restaurant_id = $1 anymore!
--
-- 6. Performance: Minimal overhead with proper indexes on restaurant_id
--
-- 7. Security: Prevents accidental data leaks even if code has bugs

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================

-- If RLS causes issues, you can disable it:
-- ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Or drop specific policies:
-- DROP POLICY suppliers_tenant_isolation ON suppliers;
