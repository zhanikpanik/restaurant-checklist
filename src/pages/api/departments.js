import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Departments API - Wrapper around sections for backward compatibility
 * This allows the custom.astro page to continue working with the new sections system
 */

// GET: Get all departments (returns sections)
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        // Return sections as "departments" for backward compatibility
        const result = await client.query(
            `SELECT
                id,
                name,
                emoji,
                is_active,
                restaurant_id,
                created_at
            FROM sections
            WHERE restaurant_id = $1 AND is_active = true
            ORDER BY name ASC`,
            [tenantId]
        );

        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error getting departments:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// POST: Create new department (creates section)
export async function POST({ request }) {
    const tenantId = getTenantId(request);
    const { name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!name || name.trim() === '') {
            throw new Error('Department name is required');
        }

        // Create section instead of department
        const result = await client.query(
            `INSERT INTO sections (name, emoji, is_active, restaurant_id)
             VALUES ($1, $2, true, $3)
             RETURNING id, name, emoji, is_active, restaurant_id, created_at`,
            [name.trim(), emoji || '📦', tenantId]
        );

        return new Response(JSON.stringify({
            success: true,
            message: 'Department created successfully',
            data: result.rows[0]
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error creating department:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// PUT: Update department (updates section)
export async function PUT({ request }) {
    const tenantId = getTenantId(request);
    const { id, name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!id || !name || name.trim() === '') {
            throw new Error('Department ID and name are required');
        }

        // Update section instead of department
        const result = await client.query(
            `UPDATE sections
             SET name = $1, emoji = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND restaurant_id = $4 AND is_active = true
             RETURNING id, name, emoji, is_active, restaurant_id`,
            [name.trim(), emoji || '📦', id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('Department not found');
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Department updated successfully',
            data: result.rows[0]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating department:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// DELETE: Soft delete department (deactivates section)
export async function DELETE({ request }) {
    const tenantId = getTenantId(request);
    const { id } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!id) {
            throw new Error('Department ID is required');
        }

        // Soft delete section instead of department
        const result = await client.query(
            `UPDATE sections
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND restaurant_id = $2
             RETURNING id, name`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('Department not found');
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Department "${result.rows[0].name}" deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
