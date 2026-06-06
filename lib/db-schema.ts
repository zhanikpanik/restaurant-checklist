import pool from "./db";

export async function setupDatabaseSchema() {
  if (!pool) {
    console.error("❌ Cannot setup database schema: pool is not initialized");
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    console.log("🔧 Setting up database schema...");

    // Create restaurants table first (for tenant management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo VARCHAR(10) DEFAULT '🍽️',
        primary_color VARCHAR(7) DEFAULT '#3B82F6',
        currency VARCHAR(3) DEFAULT '₽',
        poster_account_name VARCHAR(255),
        poster_token TEXT,
        poster_base_url TEXT,
        kitchen_storage_id INTEGER DEFAULT 1,
        bar_storage_id INTEGER DEFAULT 2,
        timezone VARCHAR(100) DEFAULT 'Europe/Moscow',
        language VARCHAR(10) DEFAULT 'ru',
        whatsapp_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Create poster_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_tokens (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id)
      );
    `);

    // Create suppliers table with restaurant_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        contact_info TEXT,
        poster_supplier_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, name)
      );
    `);

    // Create product_categories table with restaurant_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, name)
      );
    `);

    // NOTE: The legacy `products` table has been replaced by `section_products`.
    // It's kept in existing databases for historical data but no longer created for new ones.

    // Create orders table with restaurant_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        order_data JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_by_role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP
      );
    `);

    // Add updated_at if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
          ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    // NOTE: The legacy `departments` and `custom_products` tables have been
    // replaced by `sections` and `section_products`. They are no longer created.

    // Create sections table (Poster storages as default sections)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        emoji VARCHAR(10) DEFAULT '📦',
        poster_storage_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, poster_storage_id)
      );
    `);

    // Create section_products table (Products/Ingredients in each section)
    await client.query(`
      CREATE TABLE IF NOT EXISTS section_products (
        id SERIAL PRIMARY KEY,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        poster_ingredient_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50),
        category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        is_manual_check BOOLEAN DEFAULT false,
        stock_alert_days NUMERIC(3) DEFAULT 2,
        pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(section_id, poster_ingredient_id)
      );
    `);

    // Add new columns if they don't exist (for existing databases)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'is_manual_check') THEN
          ALTER TABLE section_products ADD COLUMN is_manual_check BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'stock_alert_days') THEN
          ALTER TABLE section_products ADD COLUMN stock_alert_days NUMERIC(3) DEFAULT 2;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'pinned') THEN
          ALTER TABLE section_products ADD COLUMN pinned BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'supplier_id') THEN
          ALTER TABLE section_products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'stock') THEN
          ALTER TABLE section_products ADD COLUMN stock NUMERIC(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'stock_updated_at') THEN
          ALTER TABLE section_products ADD COLUMN stock_updated_at TIMESTAMP;
        END IF;
      END $$;
    `);

// Create section_leftovers table (Inventory for each section)
    await client.query(`
      CREATE TABLE IF NOT EXISTS section_leftovers (
        id SERIAL PRIMARY KEY,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        section_product_id INTEGER NOT NULL REFERENCES section_products(id) ON DELETE CASCADE,
        quantity NUMERIC(10, 3) DEFAULT 0,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(section_id, section_product_id)
      );
    `);

    // Create user_sections junction table (Many-to-many: users <-> sections)
    // Includes permission flags for order flow control
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        can_send_orders BOOLEAN DEFAULT false,
        can_receive_supplies BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, section_id)
      );
    `);

    // Create password_reset_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create invitations table (for team member invite links)
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        sections JSONB NOT NULL DEFAULT '[]',
        can_send_orders BOOLEAN DEFAULT true,
        can_receive_supplies BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'pending',
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
        accepted_at TIMESTAMP,
        created_by INT REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Indexes + constraints for invitations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
      CREATE INDEX IF NOT EXISTS idx_invitations_restaurant ON invitations(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
    `);

    // Add constraints if not already present (safe — skips if exists)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invitation_status') THEN
          ALTER TABLE invitations ADD CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'expired'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invitation_role') THEN
          ALTER TABLE invitations ADD CONSTRAINT chk_invitation_role CHECK (role IN ('admin', 'manager', 'staff', 'delivery'));
        END IF;
      END $$;
    `);

    // Add permission columns if they don't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sections' AND column_name = 'can_send_orders') THEN
          ALTER TABLE user_sections ADD COLUMN can_send_orders BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sections' AND column_name = 'can_receive_supplies') THEN
          ALTER TABLE user_sections ADD COLUMN can_receive_supplies BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sections_restaurant_id ON sections(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sections_poster_storage_id ON sections(poster_storage_id) WHERE poster_storage_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sections_active ON sections(tenant_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_section_products_section_id ON section_products(section_id);
      CREATE INDEX IF NOT EXISTS idx_section_products_ingredient_id ON section_products(poster_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_section_leftovers_section_id ON section_leftovers(section_id);
      CREATE INDEX IF NOT EXISTS idx_section_leftovers_product_id ON section_leftovers(section_product_id);
      CREATE INDEX IF NOT EXISTS idx_user_sections_user_id ON user_sections(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sections_section_id ON user_sections(section_id);
    `);

    console.log("✅ Database schema setup complete");
  } catch (error) {
    console.error("❌ Error setting up database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Schema auto-migration is triggered from lib/db.ts on first database import.