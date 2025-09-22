-- Multi-Tenant Restaurant Management Schema
-- This file contains the enhanced database schema for multi-tenant support

-- Enhanced restaurants table with Poster integration
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS poster_token VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS poster_base_url VARCHAR(255) DEFAULT 'https://joinposter.com/api';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_storage_id INTEGER DEFAULT 1;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bar_storage_id INTEGER DEFAULT 2;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Moscow';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ru';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true;

-- Update default restaurant with example Poster token
UPDATE restaurants 
SET 
    poster_token = '305185:07928627ec76d09e589e1381710e55da',
    kitchen_storage_id = 1,
    bar_storage_id = 2
WHERE id = 'default';

-- Example restaurants with different configurations
INSERT INTO restaurants (id, name, logo, primary_color, poster_token, kitchen_storage_id, bar_storage_id) 
VALUES 
    ('restaurant_a', 'Ресторан А', '🍽️', '#3B82F6', 'POSTER_TOKEN_A:xxxxx', 1, 2),
    ('restaurant_b', 'Пиццерия Б', '🍕', '#EF4444', 'POSTER_TOKEN_B:yyyyy', 3, 4),
    ('restaurant_c', 'Суши Бар В', '🍣', '#10B981', 'POSTER_TOKEN_C:zzzzz', 5, 6)
ON CONFLICT (id) DO UPDATE SET
    poster_token = EXCLUDED.poster_token,
    kitchen_storage_id = EXCLUDED.kitchen_storage_id,
    bar_storage_id = EXCLUDED.bar_storage_id;

-- Ensure all existing data has restaurant_id
UPDATE suppliers SET restaurant_id = 'default' WHERE restaurant_id IS NULL;
UPDATE product_categories SET restaurant_id = 'default' WHERE restaurant_id IS NULL;
UPDATE orders SET restaurant_id = 'default' WHERE restaurant_id IS NULL;
UPDATE departments SET restaurant_id = 'default' WHERE restaurant_id IS NULL;
UPDATE custom_products SET restaurant_id = 'default' WHERE restaurant_id IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_departments_restaurant_id ON departments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_custom_products_restaurant_id ON custom_products(restaurant_id);
