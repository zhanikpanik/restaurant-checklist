-- Migration: Add can_send_orders and can_receive_supplies columns to user_sections table
-- Date: 2026-02-13
-- Purpose: Enable user-level permissions for sending orders and receiving supplies

-- Add columns if they don't exist
DO $$ 
BEGIN
    -- Add can_send_orders column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sections' 
        AND column_name = 'can_send_orders'
    ) THEN
        ALTER TABLE user_sections 
        ADD COLUMN can_send_orders BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Added can_send_orders column to user_sections';
    ELSE
        RAISE NOTICE 'Column can_send_orders already exists';
    END IF;

    -- Add can_receive_supplies column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sections' 
        AND column_name = 'can_receive_supplies'
    ) THEN
        ALTER TABLE user_sections 
        ADD COLUMN can_receive_supplies BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Added can_receive_supplies column to user_sections';
    ELSE
        RAISE NOTICE 'Column can_receive_supplies already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_sections' 
AND column_name IN ('can_send_orders', 'can_receive_supplies');
