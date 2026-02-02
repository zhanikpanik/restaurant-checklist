import { hash, compare } from 'bcryptjs';
import { withTenant, withoutTenant } from './db';

/**
 * Verify user credentials and return user data
 * Used for login
 * 
 * NOTE: This uses withoutTenant because we need to query by email across all restaurants
 * (user doesn't have a session yet, so we don't know their restaurant)
 */
export async function verifyUserCredentials(email: string, password: string) {
  return await withoutTenant(async (client) => {
    const result = await client.query(
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
      throw new Error('Account is disabled');
    }

    const isValidPassword = await compare(password, user.password_hash);

    if (!isValidPassword) {
      return null;
    }

    return user;
  });
}

/**
 * Create a new user
 * Uses withTenant to ensure user is created in the correct restaurant context
 */
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'staff' | 'delivery';
  restaurantId: string;
}) {
  const passwordHash = await hash(userData.password, 12);

  return await withTenant(userData.restaurantId, async (client) => {
    const result = await client.query(
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
  });
}

/**
 * Get user by email
 * NOTE: Uses withoutTenant because email is unique across all restaurants
 */
export async function getUserByEmail(email: string) {
  return await withoutTenant(async (client) => {
    const result = await client.query(
      `SELECT id, email, name, role, restaurant_id, is_active, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  });
}

/**
 * Get all users for a restaurant
 * Uses explicit WHERE clause for tenant filtering
 */
export async function getUsersByRestaurant(restaurantId: string) {
  return await withTenant(restaurantId, async (client) => {
    const result = await client.query(
      `SELECT id, email, name, role, is_active, last_login, created_at
       FROM users
       WHERE restaurant_id = $1
       ORDER BY created_at DESC`,
      [restaurantId]
    );

    return result.rows;
  });
}

/**
 * Get all users for a restaurant WITH their assigned sections (avoids N+1 queries)
 * Returns users with assigned_sections array populated
 */
export async function getUsersWithSections(restaurantId: string) {
  return await withTenant(restaurantId, async (client) => {
    // Get all users
    const usersResult = await client.query(
      `SELECT id, email, name, role, is_active, last_login, created_at
       FROM users
       WHERE restaurant_id = $1
       ORDER BY created_at DESC`,
      [restaurantId]
    );

    const users = usersResult.rows;

    if (users.length === 0) {
      return [];
    }

    // Get all user-section assignments for these users in one query
    const userIds = users.map((u: any) => u.id);
    const sectionsResult = await client.query(
      `SELECT us.user_id, s.id, s.name, s.emoji
       FROM user_sections us
       JOIN sections s ON s.id = us.section_id
       WHERE us.user_id = ANY($1) AND s.restaurant_id = $2 AND s.is_active = true
       ORDER BY s.name`,
      [userIds, restaurantId]
    );

    // Group sections by user_id
    const sectionsByUser = new Map<number, any[]>();
    for (const row of sectionsResult.rows) {
      const userId = row.user_id;
      if (!sectionsByUser.has(userId)) {
        sectionsByUser.set(userId, []);
      }
      sectionsByUser.get(userId)!.push({
        id: row.id,
        name: row.name,
        emoji: row.emoji,
      });
    }

    // Attach sections to each user
    return users.map((user: any) => ({
      ...user,
      assigned_sections: sectionsByUser.get(user.id) || [],
    }));
  });
}

/**
 * Update user password
 * Uses withoutTenant since we're updating by user ID (already verified ownership)
 */
export async function updateUserPassword(userId: number, newPassword: string) {
  const passwordHash = await hash(newPassword, 12);

  return await withoutTenant(async (client) => {
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, userId]
    );
  });
}

/**
 * Update user role
 * Uses withoutTenant since we're updating by user ID (already verified ownership in route)
 */
export async function updateUserRole(
  userId: number,
  role: 'admin' | 'manager' | 'staff' | 'delivery'
) {
  return await withoutTenant(async (client) => {
    await client.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [role, userId]
    );
  });
}

/**
 * Deactivate user
 * Uses withoutTenant since we're updating by user ID (already verified ownership in route)
 */
export async function deactivateUser(userId: number) {
  return await withoutTenant(async (client) => {
    await client.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
  });
}

/**
 * Record user login
 * Uses withoutTenant since we're updating by user ID
 */
export async function recordUserLogin(userId: number) {
  return await withoutTenant(async (client) => {
    await client.query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );
  });
}
