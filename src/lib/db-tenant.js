/**
 * Database Tenant Context Management
 * Handles setting PostgreSQL session variables for Row-Level Security (RLS)
 */

import pool from './db.js';

/**
 * Get a database client with tenant context set
 * This sets the app.current_tenant session variable that RLS policies use
 *
 * @param {string} tenantId - The restaurant/tenant ID
 * @returns {Promise<{client: object, release: function}>} Database client and release function
 */
export async function getClientWithTenant(tenantId) {
  const client = await pool.connect();

  try {
    // Set the tenant context for this session
    // Using SET LOCAL so it only applies to current transaction
    // and automatically clears when transaction ends
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_tenant = $1', [tenantId]);

    return {
      client,
      release: async () => {
        try {
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    throw error;
  }
}

/**
 * Execute a query with tenant context
 * Convenience wrapper for simple queries
 *
 * @param {string} tenantId - The restaurant/tenant ID
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
export async function queryWithTenant(tenantId, query, params = []) {
  const { client, release, rollback } = await getClientWithTenant(tenantId);

  try {
    const result = await client.query(query, params);
    await release();
    return result;
  } catch (error) {
    await rollback();
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction with tenant context
 *
 * @param {string} tenantId - The restaurant/tenant ID
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>} Result from callback
 */
export async function transactionWithTenant(tenantId, callback) {
  const { client, release, rollback } = await getClientWithTenant(tenantId);

  try {
    const result = await callback(client);
    await release();
    return result;
  } catch (error) {
    await rollback();
    throw error;
  }
}

/**
 * Check if RLS is enabled on a table
 * Useful for debugging and verification
 *
 * @param {string} tableName - Name of the table
 * @returns {Promise<boolean>} True if RLS is enabled
 */
export async function isRLSEnabled(tableName) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    `, [tableName]);

    return result.rows.length > 0 && result.rows[0].rowsecurity;
  } finally {
    client.release();
  }
}

/**
 * Get all RLS policies for a table
 * Useful for debugging
 *
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} Array of policy objects
 */
export async function getRLSPolicies(tableName) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY policyname
    `, [tableName]);

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Test RLS by checking row counts with different tenants
 * Returns counts for each tenant to verify isolation
 *
 * @param {string} tableName - Name of the table to test
 * @param {Array<string>} tenantIds - Array of tenant IDs to test
 * @returns {Promise<object>} Object mapping tenant IDs to row counts
 */
export async function testRLSIsolation(tableName, tenantIds) {
  const results = {};

  for (const tenantId of tenantIds) {
    try {
      const result = await queryWithTenant(
        tenantId,
        `SELECT COUNT(*) as count FROM ${tableName}`
      );
      results[tenantId] = parseInt(result.rows[0].count);
    } catch (error) {
      results[tenantId] = { error: error.message };
    }
  }

  return results;
}
