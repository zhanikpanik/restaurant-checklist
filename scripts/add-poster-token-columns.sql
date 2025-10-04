-- Add Poster API integration columns to restaurants table
-- Run this migration to enable multi-tenant Poster API support

-- Add poster_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'poster_token'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN poster_token VARCHAR(255);
        RAISE NOTICE 'Added poster_token column';
    ELSE
        RAISE NOTICE 'poster_token column already exists';
    END IF;
END $$;

-- Add poster_base_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'poster_base_url'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN poster_base_url VARCHAR(255) DEFAULT 'https://joinposter.com/api';
        RAISE NOTICE 'Added poster_base_url column';
    ELSE
        RAISE NOTICE 'poster_base_url column already exists';
    END IF;
END $$;

-- Add kitchen_storage_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'kitchen_storage_id'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN kitchen_storage_id INTEGER DEFAULT 1;
        RAISE NOTICE 'Added kitchen_storage_id column';
    ELSE
        RAISE NOTICE 'kitchen_storage_id column already exists';
    END IF;
END $$;

-- Add bar_storage_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'bar_storage_id'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN bar_storage_id INTEGER DEFAULT 2;
        RAISE NOTICE 'Added bar_storage_id column';
    ELSE
        RAISE NOTICE 'bar_storage_id column already exists';
    END IF;
END $$;

-- Add timezone column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Moscow';
        RAISE NOTICE 'Added timezone column';
    ELSE
        RAISE NOTICE 'timezone column already exists';
    END IF;
END $$;

-- Add language column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'language'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN language VARCHAR(5) DEFAULT 'ru';
        RAISE NOTICE 'Added language column';
    ELSE
        RAISE NOTICE 'language column already exists';
    END IF;
END $$;

-- Add whatsapp_enabled column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'whatsapp_enabled'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added whatsapp_enabled column';
    ELSE
        RAISE NOTICE 'whatsapp_enabled column already exists';
    END IF;
END $$;

-- Update existing default restaurant with poster token from environment
UPDATE restaurants
SET
    poster_token = '305185:07928627ec76d09e589e1381710e55da',
    kitchen_storage_id = 1,
    bar_storage_id = 2
WHERE id = 'default' AND poster_token IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('poster_token', 'poster_base_url', 'kitchen_storage_id', 'bar_storage_id', 'timezone', 'language', 'whatsapp_enabled')
ORDER BY column_name;
