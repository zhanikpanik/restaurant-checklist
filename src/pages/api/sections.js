import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

// GET: Get all sections for a tenant
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    console.log(`📋 [${tenantId}] Fetching sections...`);

    try {
        const result = await client.query(`
            SELECT
                s.id,
                s.name,
                s.emoji,
                s.poster_storage_id,
                s.is_active,
                s.created_at,
                COUNT(sp.id) as products_count
            FROM sections s
            LEFT JOIN section_products sp ON s.id = sp.section_id AND sp.is_active = true
            WHERE s.is_active = true AND s.restaurant_id = $1
            GROUP BY s.id, s.name, s.emoji, s.poster_storage_id, s.is_active, s.created_at
            ORDER BY s.created_at ASC
        `, [tenantId]);

        console.log(`✅ [${tenantId}] Found ${result.rows.length} sections`);

        return new Response(JSON.stringify({
            success: true,
            data: result.rows,
            debug: {
                tenantId: tenantId,
                count: result.rows.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(`❌ [${tenantId}] Error getting sections:`, error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            debug: {
                tenantId: tenantId
            }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// POST: Create new custom section (not linked to Poster)
export async function POST({ request }) {
    const tenantId = getTenantId(request);
    const { name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!name || name.trim() === '') {
            throw new Error('Section name is required');
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id, is_active)
             VALUES ($1, $2, $3, NULL, true)
             RETURNING id, name, emoji, is_active, created_at`,
            [tenantId, name.trim(), emoji || '📦']
        );

        await client.query('COMMIT');

        console.log(`✅ [${tenantId}] Created custom section: ${name}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Custom section created successfully',
            data: result.rows[0]
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error creating section:`, error);
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

// PUT: Update section
export async function PUT({ request }) {
    const tenantId = getTenantId(request);
    const { id, name, emoji } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!id || !name || name.trim() === '') {
            throw new Error('Section ID and name are required');
        }

        await client.query('BEGIN');

        // Check if this is a Poster-linked section
        const checkResult = await client.query(
            'SELECT poster_storage_id FROM sections WHERE id = $1 AND restaurant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) {
            throw new Error('Section not found');
        }

        // Allow updating name/emoji even for Poster sections
        const result = await client.query(
            `UPDATE sections
             SET name = $1, emoji = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND is_active = true AND restaurant_id = $4
             RETURNING id, name, emoji, poster_storage_id, is_active, created_at`,
            [name.trim(), emoji || '📦', id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('Section not found or inactive');
        }

        await client.query('COMMIT');

        console.log(`✅ [${tenantId}] Updated section: ${name}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Section updated successfully',
            data: result.rows[0]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error updating section:`, error);
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

// DELETE: Soft delete section (mark as inactive)
export async function DELETE({ request }) {
    const tenantId = getTenantId(request);
    const { id } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        if (!id) {
            throw new Error('Section ID is required');
        }

        await client.query('BEGIN');

        // Check if section has products
        const productsCheck = await client.query(
            'SELECT COUNT(*) as count FROM section_products WHERE section_id = $1 AND is_active = true',
            [id]
        );

        if (parseInt(productsCheck.rows[0].count) > 0) {
            throw new Error('Cannot delete section with active products. Delete products first.');
        }

        const result = await client.query(
            `UPDATE sections
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND is_active = true AND restaurant_id = $2
             RETURNING id, name`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('Section not found or already inactive');
        }

        await client.query('COMMIT');

        console.log(`✅ [${tenantId}] Deleted section: ${result.rows[0].name}`);

        return new Response(JSON.stringify({
            success: true,
            message: `Section "${result.rows[0].name}" deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ [${tenantId}] Error deleting section:`, error);
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
