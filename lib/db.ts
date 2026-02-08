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

/**
 * Execute queries within a tenant context (Row Level Security).
 * 
 * This sets the `app.current_tenant` session variable so that RLS policies
 * automatically filter data to the specified restaurant.
 * 
 * @example
 * ```typescript
 * const orders = await withTenant(restaurantId, async (client) => {
 *   // All queries automatically filtered by restaurantId
 *   const result = await client.query('SELECT * FROM orders');
 *   return result.rows;
 * });
 * ```
 * 
 * @param tenantId - The restaurant_id to scope queries to
 * @param callback - Function that receives the client and executes queries
 * @returns The result of the callback function
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    // Set the tenant for this session using set_config (supports parameterized values)
    // The third parameter 'false' makes it session-scoped (persists across queries)
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]);

    // Execute the callback with tenant context
    return await callback(client);
  } finally {
    // Reset tenant setting before releasing back to pool
    await client.query("RESET app.current_tenant");
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Execute queries within a transaction with tenant context.
 * 
 * @example
 * ```typescript
 * await withTenantTransaction(restaurantId, async (client) => {
 *   await client.query('INSERT INTO orders ...');
 *   await client.query('UPDATE inventory ...');
 *   // Auto-commits on success, auto-rollbacks on error
 * });
 * ```
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // Set the tenant for this session using set_config (supports parameterized values)
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query without tenant context (for admin operations).
 * 
 * WARNING: This bypasses RLS. Only use for:
 * - Cross-tenant admin queries
 * - Restaurant management
 * - Migrations
 */
export async function withoutTenant<T>(
  callback: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    // Reset tenant setting to ensure no accidental tenant context
    await client.query("RESET app.current_tenant");
    return await callback(client);
  } finally {
    client.release();
  }
}