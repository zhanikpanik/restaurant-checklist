import pool from "./db";

/**
 * Setup tables for Poster data synchronization
 */
export async function setupPosterSyncSchema() {
  if (!pool) {
    console.error("❌ Cannot setup sync schema: pool is not initialized");
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    console.log("🔧 Setting up Poster sync schema...");

    // Table to track sync status per restaurant
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_sync_status (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL, -- 'products', 'categories', 'suppliers', 'ingredients'
        last_sync_at TIMESTAMP,
        last_sync_success BOOLEAN DEFAULT true,
        last_sync_error TEXT,
        sync_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, entity_type)
      );
    `);

    // Table to cache Poster categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_categories (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        poster_category_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_category_id VARCHAR(100),
        sort_order INTEGER,
        is_visible BOOLEAN DEFAULT true,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, poster_category_id)
      );
    `);

    // Table to cache Poster products
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_products (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        poster_product_id VARCHAR(100) NOT NULL,
        poster_category_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2),
        cost NUMERIC(10, 2),
        unit VARCHAR(50),
        is_visible BOOLEAN DEFAULT true,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, poster_product_id)
      );
    `);

    // Table to cache Poster suppliers
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_suppliers (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        poster_supplier_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        comment TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, poster_supplier_id)
      );
    `);

    // Table to cache Poster ingredients (storage items)
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_ingredients (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        poster_ingredient_id VARCHAR(100) NOT NULL,
        poster_category_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50),
        unit_weight NUMERIC(10, 3),
        cost NUMERIC(10, 2),
        is_visible BOOLEAN DEFAULT true,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, poster_ingredient_id)
      );
    `);

    // Table to cache Poster storages
    await client.query(`
      CREATE TABLE IF NOT EXISTS poster_storages (
        id SERIAL PRIMARY KEY,
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        poster_storage_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, poster_storage_id)
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_poster_sync_status_restaurant ON poster_sync_status(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_poster_categories_restaurant ON poster_categories(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_poster_products_restaurant ON poster_products(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_poster_products_category ON poster_products(poster_category_id);
      CREATE INDEX IF NOT EXISTS idx_poster_suppliers_restaurant ON poster_suppliers(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_poster_ingredients_restaurant ON poster_ingredients(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_poster_ingredients_category ON poster_ingredients(poster_category_id);
      CREATE INDEX IF NOT EXISTS idx_poster_storages_restaurant ON poster_storages(restaurant_id);
    `);

    console.log("✅ Poster sync schema setup complete");
  } catch (error) {
    console.error("❌ Error setting up Poster sync schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run on import if AUTO_MIGRATE is set
// Set AUTO_MIGRATE=true in your environment to auto-create tables
if (process.env.AUTO_MIGRATE === "true") {
  console.log("🔄 AUTO_MIGRATE enabled - Running Poster sync schema setup...");
  setupPosterSyncSchema()
    .then(() => console.log("✅ Poster sync schema ready"))
    .catch((error) => {
      console.error("❌ Failed to setup Poster sync schema:", error);
      // Don't crash the app, just log the error
    });
}
