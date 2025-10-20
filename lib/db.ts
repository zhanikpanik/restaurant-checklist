import { Pool } from "pg";

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️  DATABASE_URL is not set - database features will be disabled");
}

let pool: Pool | null = null;

try {
  pool = databaseUrl
    ? new Pool({
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
        connectionTimeoutMillis: 10000, // 10 seconds timeout
        maxUses: 7500, // Recycle connection after 7500 queries (prevent memory leaks)
        allowExitOnIdle: true, // Allow pool to close if no activity

        // Add connection retry settings
        application_name: "restaurant-checklist",
        statement_timeout: 10000, // 10 second query timeout
        query_timeout: 10000,
      })
    : null;
} catch (error) {
  console.error("❌ Failed to create database pool:", error);
  pool = null;
}

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
  if (process.env.NODE_ENV === "development") {
    setInterval(() => {
      console.log("📊 DB Pool Stats:", {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    }, 300000);
  }

  // Test the connection on startup
  pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connected successfully'))
    .catch((err) => console.error('❌ Database connection failed:', err));
}

// Export the pool for querying the database from other parts of the application
export default pool;