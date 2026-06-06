/**
 * One-shot local DB schema migration.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-local.ts
 * Or simpler: copy .env.local → trigger via API
 */
const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🔧 Creating schema...");

    // Restaurants
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo VARCHAR(10) DEFAULT '🍽️',
        primary_color VARCHAR(7) DEFAULT '#3B82F6',
        currency VARCHAR(3) DEFAULT '₸',
        poster_account_name VARCHAR(255),
        poster_token TEXT,
        poster_base_url TEXT,
        kitchen_storage_id INTEGER DEFAULT 1,
        bar_storage_id INTEGER DEFAULT 2,
        timezone VARCHAR(100) DEFAULT 'Asia/Almaty',
        language VARCHAR(10) DEFAULT 'ru',
        whatsapp_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'staff', 'delivery'))
      );
    `);

    // Suppliers
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

    // Product categories
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

    // Sections
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

    // Section products (with new columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS section_products (
        id SERIAL PRIMARY KEY,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        poster_ingredient_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50),
        category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        is_manual_check BOOLEAN DEFAULT false,
        stock_alert_days NUMERIC(3) DEFAULT 2,
        pinned BOOLEAN DEFAULT false,
        stock NUMERIC(10,2) DEFAULT 0,
        stock_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(section_id, poster_ingredient_id)
      );
    `);

    // Orders
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

    // User sections
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

    // Password reset tokens
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

    // Poster sync tables
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_sync_status (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        last_sync_at TIMESTAMP,
        last_sync_success BOOLEAN DEFAULT true,
        last_sync_error TEXT,
        sync_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, entity_type)
      );
    `);

    console.log("✅ Schema created successfully");

    // Seed: create default restaurant
    const existing = await client.query("SELECT id FROM restaurants WHERE id = 'default'");
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO restaurants (id, name, currency)
        VALUES ('default', 'Тестовый ресторан', '₸')
      `);
      console.log("✅ Default restaurant created (id='default')");
    }

    // Seed: create admin user (password: admin123)
    const { hashSync } = require("bcryptjs");
    const existingUser = await client.query("SELECT id FROM users WHERE email = 'admin@test.local'");
    if (existingUser.rows.length === 0) {
      const hash = hashSync("admin123", 10);
      await client.query(`
        INSERT INTO users (email, password_hash, name, role, restaurant_id)
        VALUES ('admin@test.local', $1, 'Администратор', 'admin', 'default')
      `, [hash]);
      console.log("✅ Admin user created: admin@test.local / admin123");
    }

    // Seed: create a test section
    const existingSection = await client.query("SELECT id FROM sections WHERE tenant_id = 'default'");
    if (existingSection.rows.length === 0) {
      await client.query(`
        INSERT INTO sections (tenant_id, restaurant_id, name, emoji, is_active)
        VALUES ('default', 'default', 'Кухня', '🍳', true)
      `);
      console.log("✅ Test section 'Кухня' created");
    }

    // Seed: sample products
    const section = await client.query("SELECT id FROM sections WHERE tenant_id = 'default' LIMIT 1");
    if (section.rows.length > 0) {
      const sectionId = section.rows[0].id;
      const count = await client.query("SELECT COUNT(*) FROM section_products WHERE section_id = $1", [sectionId]);
      if (parseInt(count.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO section_products (section_id, poster_ingredient_id, name, unit, stock, is_manual_check)
          VALUES
            ($1, 'custom_1', 'Кола 0.33', 'шт', 10, false),
            ($1, 'custom_2', 'Мука', 'кг', 50, false),
            ($1, 'custom_3', 'Помидоры', 'кг', 12, false),
            ($1, 'custom_4', 'Соль', 'кг', 5, true),
            ($1, 'custom_5', 'Курица', 'кг', 3, false),
            ($1, 'custom_6', 'Масло растительное', 'л', 8, true)
        `, [sectionId]);
        console.log("✅ Sample products seeded (6 items)");
      }
    }

    // Show results
    const tables = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log("\n📋 Tables:", tables.rows.map(r => r.tablename).join(", "));

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
