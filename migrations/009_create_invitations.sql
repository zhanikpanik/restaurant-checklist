-- Create invitations table for user registration links
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  restaurant_id VARCHAR(255) NOT NULL,
  
  -- Pre-filled info (optional)
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  
  -- Section permissions (JSON)
  sections JSONB NOT NULL,
  -- Example: [{"section_id": 1, "can_send_orders": true, "can_receive_supplies": false}]
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'accepted', 'expired'
  user_id INT,  -- Filled after registration
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_by INT,
  
  -- Foreign keys
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_restaurant ON invitations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Add constraint to ensure valid status
ALTER TABLE invitations ADD CONSTRAINT chk_invitation_status 
  CHECK (status IN ('pending', 'accepted', 'expired'));

-- Add constraint to ensure valid role
ALTER TABLE invitations ADD CONSTRAINT chk_invitation_role 
  CHECK (role IN ('admin', 'manager', 'staff', 'delivery'));
