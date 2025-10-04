-- Add a new restaurant with Poster API configuration
-- Replace the values below with your restaurant's information

INSERT INTO restaurants (
    id,
    name,
    logo,
    primary_color,
    currency,
    poster_token,
    poster_base_url,
    kitchen_storage_id,
    bar_storage_id,
    timezone,
    language,
    whatsapp_enabled,
    is_active
) VALUES (
    'restaurant_pizzeria',           -- Unique ID (use lowercase, underscores)
    'Пиццерия Марио',               -- Display name
    '🍕',                            -- Logo emoji
    '#EF4444',                       -- Primary color (hex)
    '₽',                             -- Currency symbol
    '123456:your_poster_token_here', -- Poster API token (format: account_id:token)
    'https://joinposter.com/api',    -- Poster API base URL
    1,                               -- Kitchen storage ID in Poster
    2,                               -- Bar storage ID in Poster
    'Europe/Moscow',                 -- Timezone
    'ru',                            -- Language
    true,                            -- WhatsApp enabled
    true                             -- Is active
)
ON CONFLICT (id) DO UPDATE SET
    poster_token = EXCLUDED.poster_token,
    kitchen_storage_id = EXCLUDED.kitchen_storage_id,
    bar_storage_id = EXCLUDED.bar_storage_id,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the restaurant was added
SELECT id, name, poster_token, kitchen_storage_id, bar_storage_id, is_active
FROM restaurants
WHERE id = 'restaurant_pizzeria';
