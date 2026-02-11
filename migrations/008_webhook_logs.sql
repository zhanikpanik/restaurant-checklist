-- Create webhook logs table for tracking webhook events
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  webhook_type VARCHAR(50) NOT NULL, -- 'poster', 'custom', etc.
  object_type VARCHAR(100), -- 'product', 'supplier', 'storage', etc.
  object_id VARCHAR(255),
  action VARCHAR(50), -- 'added', 'changed', 'removed'
  payload JSONB,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying logs by restaurant
CREATE INDEX IF NOT EXISTS idx_webhook_logs_restaurant ON webhook_logs(restaurant_id);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Index for searching by object
CREATE INDEX IF NOT EXISTS idx_webhook_logs_object ON webhook_logs(object_type, object_id);
