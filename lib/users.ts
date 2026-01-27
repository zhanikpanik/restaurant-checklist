import pool from "./db";
import { hash, compare } from "bcryptjs";

/**
 * Verify user credentials and return user data
 * Used by NextAuth credentials provider
 */
export async function verifyUserCredentials(email: string, password: string) {
  if (!pool) {
    throw new Error("Database not available");
  }

  const result = await pool.query(
    `SELECT 
      u.id, u.email, u.name, u.password_hash, u.role, u.is_active,
      u.restaurant_id, r.name as restaurant_name
    FROM users u
    LEFT JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  if (!user.is_active) {
    throw new Error("Account is disabled");
  }

  const isValidPassword = await compare(password, user.password_hash);

  if (!isValidPassword) {
    return null;
  }

  return user;
}

/**
 * Create users table for authentication
 */
export async function setupUsersSchema() {
  if (!pool) {
    console.error("❌ Cannot setup users schema: pool is not initialized");
    throw new Error("Database pool not initialized");
  }

  const client = await pool.connect();

  try {
    console.log("🔧 Setting up users schema...");

    // Create users table
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

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);

    console.log("✅ Users schema setup complete");
  } catch (error) {
    console.error("❌ Error setting up users schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
  restaurantId: string;
}) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const passwordHash = await hash(userData.password, 12);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, restaurant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, restaurant_id, created_at`,
    [
      userData.email.toLowerCase(),
      passwordHash,
      userData.name,
      userData.role,
      userData.restaurantId,
    ]
  );

  return result.rows[0];
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const result = await pool.query(
    `SELECT id, email, name, role, restaurant_id, is_active, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

/**
 * Get all users for a restaurant
 */
export async function getUsersByRestaurant(restaurantId: string) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const result = await pool.query(
    `SELECT id, email, name, role, is_active, last_login, created_at
     FROM users WHERE restaurant_id = $1
     ORDER BY created_at DESC`,
    [restaurantId]
  );

  return result.rows;
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: number, newPassword: string) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const passwordHash = await hash(newPassword, 12);

  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: number,
  role: "admin" | "manager" | "staff" | "delivery"
) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  await pool.query(
    `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [role, userId]
  );
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: number) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  await pool.query(
    `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Record user login
 */
export async function recordUserLogin(userId: number) {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  await pool.query(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [userId]
  );
}
