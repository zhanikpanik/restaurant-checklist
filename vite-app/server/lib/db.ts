import { Pool, PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL is not set - database features will be disabled');
}

let pool: Pool | null = null;

try {
  pool = databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl?.includes('railway.internal')
          ? false
          : {
              rejectUnauthorized: false,
            },
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        maxUses: 7500,
        allowExitOnIdle: true,
        application_name: 'restaurant-checklist',
        statement_timeout: 10000,
        query_timeout: 10000,
      })
    : null;
} catch (error) {
  console.error('❌ Failed to create database pool:', error);
  pool = null;
}

if (pool) {
  pool.on('error', (err) => {
    console.error('💥 Unexpected database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('🔌 Database client connected');
  });

  pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connected successfully'))
    .catch((err) => console.error('❌ Database connection failed:', err));
}

export default pool;

export async function withTenant<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]);
    return await callback(client);
  } finally {
    await client.query('RESET app.current_tenant');
    client.release();
  }
}

export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withoutTenant<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query('RESET app.current_tenant');
    return await callback(client);
  } finally {
    client.release();
  }
}
