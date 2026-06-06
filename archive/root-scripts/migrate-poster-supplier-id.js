import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, ".env") });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🔗 Connecting to database...");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🔧 Running migration: Adding poster_supplier_id column...");

    // Add the column
    await client.query(`
            ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS poster_supplier_id INTEGER;
        `);

    console.log("✅ Migration complete!");

    // Verify
    const result = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'suppliers'
            ORDER BY ordinal_position;
        `);

    console.log("\n📋 Suppliers table columns:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
