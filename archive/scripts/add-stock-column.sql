-- Add stock column to section_products table
ALTER TABLE section_products 
ADD COLUMN IF NOT EXISTS stock NUMERIC(10, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add comment explaining the column
COMMENT ON COLUMN section_products.stock IS 'Current stock quantity (leftover)';
