import { Pool } from "pg";

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️  DATABASE_URL is not set - database features will be disabled");
}

let pool: Pool | null = null;

try {
  const isLocal = databaseUrl?.includes("localhost") || databaseUrl?.includes("127.0.0.1");
  const isInternal = databaseUrl?.includes("railway.internal");
  
  pool = databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
        ssl: (isLocal || isInternal)
          ? false
          : { rejectUnauthorized: false },
        // Connection pool settings
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000, // Increased to 20s for slow cold starts
        maxUses: 7500,
        allowExitOnIdle: true,

        // Add connection retry settings
        application_name: "restaurant-checklist",
        statement_timeout: 30000, // Increased to 30s
        query_timeout: 30000,
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

// Auto-migrate schema on first import (in development or when AUTO_MIGRATE=true)
// Uses dynamic import which works in both dev and production Next.js builds
if (pool && (process.env.NODE_ENV === "development" || process.env.AUTO_MIGRATE === "true")) {
  import("@/lib/db-schema")
    .then(({ setupDatabaseSchema }) => setupDatabaseSchema())
    .catch((err: Error) =>
      console.error("❌ Core schema migration failed:", err.message)
    );
  import("@/lib/poster-sync-schema")
    .then(({ setupPosterSyncSchema }) => setupPosterSyncSchema())
    .catch((err: Error) =>
      console.error("❌ Poster sync schema migration failed:", err.message)
    );
}

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
    // Reset tenant setting before releasing back to pool.
    // Wrap in try/catch — if the callback errored inside a transaction,
    // RESET will fail. We must not mask the original error.
    try {
      await client.query("RESET app.current_tenant");
    } catch {
      // Ignore reset errors — the original error is more important
    }
    // Always release the client back to the pool (safe even on broken connections)
    client.release();
  }
}

/**
 * Execute multiple callbacks within a single tenant-scoped connection.
 * 
 * This avoids the overhead of acquiring/releasing a pool client and
 * setting/resetting the tenant variable for each query.
 * 
 * @example
 * const [sections, orders] = await withTenantBatch(restaurantId, [
 *   (c) => c.query('SELECT * FROM sections'),
 *   (c) => c.query('SELECT * FROM orders'),
 * ]);
 */
export async function withTenantBatch<T extends any[]>(
  tenantId: string,
  callbacks: { [K in keyof T]: (client: import("pg").PoolClient) => Promise<T[K]> }
): Promise<T> {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]);

    const results: any[] = [];
    for (const cb of callbacks) {
      results.push(await cb(client));
    }

    return results as T;
  } finally {
    try {
      await client.query("RESET app.current_tenant");
    } catch {
      // Ignore reset errors
    }
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
    try {
      await client.query("RESET app.current_tenant");
    } catch {
      // RESET may fail if no tenant was set — safe to ignore
    }
    return await callback(client);
  } finally {
    client.release();
  }
}