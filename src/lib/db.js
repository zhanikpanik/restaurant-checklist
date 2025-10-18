import pg from "pg";

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const databaseUrl = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("🔴 DATABASE_URL is not set in environment variables");
  console.error(
    "Please check your .env file contains: DATABASE_URL=your_database_connection_string",
  );
}

const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl?.includes("railway.internal")
        ? false
        : {
            rejectUnauthorized: false, // Required for some cloud database providers
          },
      // Connection pool settings optimized for 5-10 restaurants
      max: 20, // Maximum connections (was 10, increased for multiple restaurants)
      min: 2, // Minimum idle connections (keep 2 connections always ready)
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 20000, // 20 seconds (allow time for remote connections)
      maxUses: 7500, // Recycle connection after 7500 queries (prevent memory leaks)
      allowExitOnIdle: true, // Allow pool to close if no activity

      // Add connection retry settings
      application_name: "restaurant-checklist",
      statement_timeout: 30000, // 30 second query timeout (prevent long-running queries)
      query_timeout: 30000,
    })
  : null;

// Monitor pool health
if (pool) {
  pool.on("error", (err) => {
    console.error("💥 Unexpected database pool error:", err);
  });

  pool.on("connect", () => {
    console.log("🔌 Database client connected");
  });

  pool.on("remove", () => {
    console.log("🔌 Database client removed from pool");
  });

  // Log pool statistics every 5 minutes for monitoring
  setInterval(() => {
    console.log("📊 DB Pool Stats:", {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  }, 300000);
}

import { setupDatabaseSchema } from "./db-schema.js";

// Initialize the database schema on application startup.
// This will create or update tables as needed.
async function initializeDb() {
  if (!pool) {
    console.error(
      "🔴🔴🔴 CRITICAL: Database pool not initialized. Check DATABASE_URL environment variable. 🔴🔴🔴",
    );
    return;
  }

  try {
    console.log("Initializing database connection and schema...");
    await setupDatabaseSchema();
    console.log("✅ Database initialization complete.");
  } catch (error) {
    console.error(
      "🔴🔴🔴 CRITICAL: Failed to initialize the database. The app may not function correctly. 🔴🔴🔴",
    );
    console.error(error);
  }
}

// We'll export the initialization function to be called from an entry point,
// but also call it here to ensure it runs when the module is loaded.
initializeDb();

// Export the pool for querying the database from other parts of the application
export default pool;
