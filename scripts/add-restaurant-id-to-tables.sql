-- Add restaurant_id column to all tables for multi-tenant support
-- This migration ensures data isolation between different restaurants

-- Add restaurant_id to custom_products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'custom_products' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE custom_products ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_custom_products_restaurant_id ON custom_products(restaurant_id);
        RAISE NOTICE 'Added restaurant_id to custom_products';
    ELSE
        RAISE NOTICE 'restaurant_id already exists in custom_products';
    END IF;
END $$;

-- Add restaurant_id to departments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'departments' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE departments ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_departments_restaurant_id ON departments(restaurant_id);
        RAISE NOTICE 'Added restaurant_id to departments';
    ELSE
        RAISE NOTICE 'restaurant_id already exists in departments';
    END IF;
END $$;

-- Add restaurant_id to product_categories table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_categories' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE product_categories ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
        RAISE NOTICE 'Added restaurant_id to product_categories';
    ELSE
        RAISE NOTICE 'restaurant_id already exists in product_categories';
    END IF;
END $$;

-- Add restaurant_id to suppliers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
        RAISE NOTICE 'Added restaurant_id to suppliers';
    ELSE
        RAISE NOTICE 'restaurant_id already exists in suppliers';
    END IF;
END $$;

-- Add restaurant_id to orders table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
        RAISE NOTICE 'Added restaurant_id to orders';
    ELSE
        RAISE NOTICE 'restaurant_id already exists in orders';
    END IF;
END $$;

-- Add restaurant_id to products table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'products' AND column_name = 'restaurant_id'
        ) THEN
            ALTER TABLE products ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
            RAISE NOTICE 'Added restaurant_id to products';
        ELSE
            RAISE NOTICE 'restaurant_id already exists in products';
        END IF;
    ELSE
        RAISE NOTICE 'products table does not exist, skipping';
    END IF;
END $$;

-- Verify all columns were added
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE column_name = 'restaurant_id'
  AND table_name IN ('custom_products', 'departments', 'product_categories', 'suppliers', 'orders', 'products')
ORDER BY table_name;
