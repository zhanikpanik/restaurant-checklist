-- Fix sections table to support multi-tenant properly
-- The current unique constraint on poster_storage_id prevents multiple restaurants
-- from having sections with the same Poster storage ID

BEGIN;

-- Drop the old unique constraint on poster_storage_id only
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_poster_storage_id_key;

-- Add a composite unique constraint on (restaurant_id, poster_storage_id)
-- This allows different restaurants to have sections with the same poster_storage_id
ALTER TABLE sections ADD CONSTRAINT sections_restaurant_poster_storage_unique
    UNIQUE (restaurant_id, poster_storage_id);

-- Verify the constraint was added
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%sections%' AND contype = 'u';

COMMIT;

-- Show current sections by restaurant
SELECT restaurant_id, COUNT(*) as section_count,
       STRING_AGG(name, ', ') as section_names
FROM sections
GROUP BY restaurant_id
ORDER BY restaurant_id;
