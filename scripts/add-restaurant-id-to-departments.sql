-- Add restaurant_id to departments table for multi-tenancy

-- Step 1: Add the column (nullable first)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS restaurant_id TEXT;

-- Step 2: Set restaurant_id for existing departments to 'default'
-- (you can change this to a specific restaurant if needed)
UPDATE departments
SET restaurant_id = 'default'
WHERE restaurant_id IS NULL;

-- Step 3: Make it required
ALTER TABLE departments
ALTER COLUMN restaurant_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_departments_restaurant_id
ON departments(restaurant_id);

-- Step 5: Add composite unique constraint (name must be unique per restaurant)
-- First drop the old unique constraint if it exists
ALTER TABLE departments
DROP CONSTRAINT IF EXISTS departments_name_key;

-- Add new composite constraint
ALTER TABLE departments
ADD CONSTRAINT departments_name_restaurant_unique
UNIQUE (name, restaurant_id);

-- Verification
SELECT
    d.id,
    d.name,
    d.emoji,
    d.restaurant_id,
    d.is_active,
    COUNT(cp.id) as custom_products_count
FROM departments d
LEFT JOIN custom_products cp ON d.id = cp.department_id AND cp.is_active = true
GROUP BY d.id, d.name, d.emoji, d.restaurant_id, d.is_active
ORDER BY d.restaurant_id, d.name;
