-- Add OAuth columns to restaurants table for Poster marketplace app integration
-- This migration supports OAuth 2.0 flow for multi-tenant apps

-- Add poster_account_name column (the Poster account identifier from OAuth)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'poster_account_name'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN poster_account_name VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_restaurants_poster_account ON restaurants(poster_account_name);
        RAISE NOTICE 'Added poster_account_name column';
    ELSE
        RAISE NOTICE 'poster_account_name column already exists';
    END IF;
END $$;

-- Add token_expires_at column (for token expiration tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'token_expires_at'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN token_expires_at TIMESTAMP;
        RAISE NOTICE 'Added token_expires_at column';
    ELSE
        RAISE NOTICE 'token_expires_at column already exists';
    END IF;
END $$;

-- Add oauth_state column (for OAuth security state parameter)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'oauth_state'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN oauth_state VARCHAR(255);
        RAISE NOTICE 'Added oauth_state column';
    ELSE
        RAISE NOTICE 'oauth_state column already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('poster_account_name', 'token_expires_at', 'oauth_state')
ORDER BY column_name;
