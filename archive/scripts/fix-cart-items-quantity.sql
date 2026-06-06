-- Migration to fix cart_items quantity column to support decimal values
-- Run this if you get "invalid input syntax for type integer" errors

-- Drop and recreate with correct type
DROP TABLE IF EXISTS cart_items CASCADE;

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_department ON cart_items(department);
CREATE INDEX IF NOT EXISTS idx_cart_items_restaurant ON cart_items(restaurant_id);

