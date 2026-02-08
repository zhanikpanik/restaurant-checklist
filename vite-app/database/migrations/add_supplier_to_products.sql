-- Migration: Add supplier_id directly to section_products
-- This simplifies the structure from: Ingredients -> Categories -> Suppliers
-- To: Ingredients -> Suppliers (direct link)

-- Add supplier_id column to section_products
ALTER TABLE section_products 
ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;

-- Migrate existing data: copy supplier_id from categories to products
UPDATE section_products sp
SET supplier_id = pc.supplier_id
FROM product_categories pc
WHERE sp.category_id = pc.id 
  AND sp.supplier_id IS NULL
  AND pc.supplier_id IS NOT NULL;

-- Make category_id optional (it already is, but this makes it explicit)
-- We're keeping category_id for now in case you want to use it for organization
-- but it's no longer required for supplier linking

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_section_products_supplier_id ON section_products(supplier_id);

-- Note: We're NOT dropping category_id or product_categories table
-- in case you want to keep categories for organizational purposes
-- If you want to completely remove categories, uncomment below:

-- ALTER TABLE section_products DROP COLUMN IF EXISTS category_id;
-- DROP TABLE IF EXISTS product_categories CASCADE;
