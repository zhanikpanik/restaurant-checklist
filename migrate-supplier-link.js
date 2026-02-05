const { Pool } = require('pg');

// Use the proxy URL directly
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:mDnveVoNDWBsLgykdqCrKmBJAfJGKoMf@shortline.proxy.rlwy.net:37099/railway";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function migrateSchema() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Linking products directly to suppliers...');

    // 1. Add supplier_id column to section_products if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_products' AND column_name = 'supplier_id') THEN
          ALTER TABLE section_products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
          RAISE NOTICE 'Added supplier_id column to section_products';
        END IF;
      END $$;
    `);

    // 2. Migrate existing data: Copy supplier_id from categories to products
    // We join section_products -> product_categories -> suppliers
    const res = await client.query(`
      UPDATE section_products sp
      SET supplier_id = pc.supplier_id
      FROM product_categories pc
      WHERE sp.category_id = pc.id
      AND sp.supplier_id IS NULL
    `);
    
    console.log(`Migrated ${res.rowCount} products to direct supplier links.`);

    // 3. Make category_id optional (drop NOT NULL if it exists, though usually it is optional)
    await client.query(`
      ALTER TABLE section_products ALTER COLUMN category_id DROP NOT NULL;
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSchema();
