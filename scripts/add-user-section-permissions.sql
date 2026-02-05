-- Migration: Add permission columns to user_sections table
-- These columns control what actions users can perform on orders for their assigned sections

-- Add can_send_orders column (allows user to send orders to suppliers via WhatsApp)
ALTER TABLE user_sections 
ADD COLUMN IF NOT EXISTS can_send_orders BOOLEAN DEFAULT false;

-- Add can_receive_supplies column (allows user to confirm delivery and enter actual quantities/prices)
ALTER TABLE user_sections 
ADD COLUMN IF NOT EXISTS can_receive_supplies BOOLEAN DEFAULT false;

-- Comment on columns for documentation
COMMENT ON COLUMN user_sections.can_send_orders IS 'If true, user can send orders to suppliers via WhatsApp for this section';
COMMENT ON COLUMN user_sections.can_receive_supplies IS 'If true, user can confirm delivery and adjust quantities/prices for this section';

-- Set default permissions for existing admin/manager users (they should have all permissions by default)
-- Note: This assumes managers are assigned to sections. If not, this won't affect them.
-- The application logic handles admin/manager having implicit full permissions.

-- Create an index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_sections_permissions 
ON user_sections(user_id, section_id, can_send_orders, can_receive_supplies);
