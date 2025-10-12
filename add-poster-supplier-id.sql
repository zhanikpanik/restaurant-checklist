-- Add poster_supplier_id column to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS poster_supplier_id INTEGER;

-- Show the result
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'suppliers'
ORDER BY ordinal_position;
