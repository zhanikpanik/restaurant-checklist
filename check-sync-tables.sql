-- Check if Poster sync tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN (
  'poster_sync_status',
  'poster_categories', 
  'poster_products',
  'poster_suppliers',
  'poster_ingredients',
  'poster_storages'
)
ORDER BY table_name;
