import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

// GET: Get all departments for a tenant
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const result = await client.query(`
            SELECT
                d.id,
                d.name,
                d.emoji,
                d.poster_storage_id,
                d.is_active,
                d.created_at,
                COUNT(cp.id) as custom_products_count
            FROM departments d
            LEFT JOIN custom_products cp ON d.id = cp.department_id AND cp.is_active = true AND cp.restaurant_id = $1
            WHERE d.is_active = true AND d.restaurant_id = $1
            GROUP BY d.id, d.name, d.emoji, d.poster_storage_id, d.is_active, d.created_at
            ORDER BY d.created_at ASC
        `, [tenantId]);

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

// POST: Create new department
export async function POST({ request }) {
    const tenantId = getTenantId(request);
    const { name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;


    try {
        if (!name || name.trim() === '') {
            throw new Error('Department name is required');
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO departments (name, emoji, poster_storage_id, is_active, restaurant_id)
             VALUES ($1, $2, NULL, true, $3)
             RETURNING id, name, emoji, is_active, created_at`,
            [name.trim(), emoji || '📦', tenantId]
        );
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Department created successfully',
            data: result.rows[0]
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
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

// PUT: Update department
export async function PUT({ request }) {
    const tenantId = getTenantId(request);
    const { id, name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;


    try {
        if (!id || !name || name.trim() === '') {
            throw new Error('Department ID and name are required');
        }

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE departments
             SET name = $1, emoji = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND is_active = true AND restaurant_id = $4
             RETURNING id, name, emoji, is_active, created_at`,
            [name.trim(), emoji || '📦', id, tenantId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Department not found or inactive');
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Department updated successfully',
            data: result.rows[0]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
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

// DELETE: Soft delete department (mark as inactive)
export async function DELETE({ request }) {
    const tenantId = getTenantId(request);
    const { id } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;


    try {
        if (!id) {
            throw new Error('Department ID is required');
        }

        await client.query('BEGIN');

        // Check if department has custom products (tenant-specific)
        const productsCheck = await client.query(
            'SELECT COUNT(*) as count FROM custom_products WHERE department_id = $1 AND is_active = true AND restaurant_id = $2',
            [id, tenantId]
        );

        if (parseInt(productsCheck.rows[0].count) > 0) {
            throw new Error('Cannot delete department with active custom products');
        }

        const result = await client.query(
            `UPDATE departments
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_active = true AND restaurant_id = $2
             RETURNING id, name`,
            [id, tenantId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Department not found or already inactive');
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: `Department "${result.rows[0].name}" deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
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
