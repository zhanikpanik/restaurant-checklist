-- =====================================================
-- PHASE 1: CRITICAL MULTI-TENANT DATABASE FIXES
-- Fix all unique constraints to properly support multiple restaurants
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SUPPLIERS TABLE
-- =====================================================

-- Drop the global name constraint (allows different restaurants to have suppliers with same name)
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_name_key;

-- Add composite constraints for multi-tenant support
-- Each restaurant can have suppliers with same name
ALTER TABLE suppliers ADD CONSTRAINT suppliers_restaurant_name_unique
    UNIQUE (restaurant_id, name);

-- Each restaurant can have suppliers with same Poster ID
-- This allows Supplier "Coca-Cola" from Restaurant A (poster_supplier_id: 123)
-- to coexist with Supplier "Pepsi" from Restaurant B (poster_supplier_id: 123)
ALTER TABLE suppliers ADD CONSTRAINT suppliers_restaurant_poster_unique
    UNIQUE (restaurant_id, poster_supplier_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_poster
    ON suppliers(restaurant_id, poster_supplier_id)
    WHERE poster_supplier_id IS NOT NULL;

-- =====================================================
-- 2. PRODUCT_CATEGORIES TABLE
-- =====================================================

-- Drop global constraints
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_poster_category_id_key;

-- Add composite constraints for multi-tenant support
ALTER TABLE product_categories ADD CONSTRAINT product_categories_restaurant_name_unique
    UNIQUE (restaurant_id, name);

ALTER TABLE product_categories ADD CONSTRAINT product_categories_restaurant_poster_unique
    UNIQUE (restaurant_id, poster_category_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_poster
    ON product_categories(restaurant_id, poster_category_id)
    WHERE poster_category_id IS NOT NULL;

-- =====================================================
-- 3. SECTIONS TABLE (Clean up duplicate constraints)
-- =====================================================

-- Drop the old duplicate constraint if it exists
-- We already have sections_restaurant_id_poster_storage_id_key from previous migration
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_restaurant_poster_storage_unique;

-- Keep only: sections_restaurant_id_poster_storage_id_key

-- =====================================================
-- 4. VERIFY EXISTING GOOD CONSTRAINTS
-- =====================================================

-- These tables already have correct multi-tenant constraints:
-- ✅ departments: UNIQUE(restaurant_id, poster_storage_id)
-- ✅ section_products: UNIQUE(section_id, poster_ingredient_id) - section_id ties to restaurant
-- ✅ products: UNIQUE(restaurant_id, name, department)
-- ✅ sections: UNIQUE(restaurant_id, poster_storage_id)

-- =====================================================
-- 5. ADD MISSING INDEXES ON restaurant_id
-- =====================================================

-- These indexes may already exist from database-indexes.sql, but safe to re-run
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id
    ON suppliers(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id
    ON product_categories(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_sections_restaurant_id
    ON sections(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_departments_restaurant_id
    ON departments(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_id
    ON products(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_custom_products_restaurant_id
    ON custom_products(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id
    ON orders(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_poster_tokens_restaurant_id
    ON poster_tokens(restaurant_id);

-- =====================================================
-- VERIFY CHANGES
-- =====================================================

-- Show all unique constraints after migration
SELECT
    tc.table_name,
    tc.constraint_name,
    STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('suppliers', 'product_categories', 'sections', 'departments', 'section_products', 'products')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

COMMIT;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
--
-- suppliers:
--   - suppliers_restaurant_name_unique (restaurant_id, name)
--   - suppliers_restaurant_poster_unique (restaurant_id, poster_supplier_id)
--
-- product_categories:
--   - product_categories_restaurant_name_unique (restaurant_id, name)
--   - product_categories_restaurant_poster_unique (restaurant_id, poster_category_id)
--
-- sections:
--   - sections_restaurant_id_poster_storage_id_key (restaurant_id, poster_storage_id)
--
-- departments:
--   - departments_restaurant_id_poster_storage_id_key (restaurant_id, poster_storage_id)
--
-- section_products:
--   - section_products_section_id_poster_ingredient_id_key (section_id, poster_ingredient_id)
--
-- products:
--   - products_restaurant_id_name_department_key (restaurant_id, name, department)
--
-- =====================================================
