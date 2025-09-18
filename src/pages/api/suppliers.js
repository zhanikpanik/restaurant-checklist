import pool from '../../lib/db.js';
import { getTenantFilter } from '../../lib/tenant.js';

export const prerender = false;

// GET: Fetch all suppliers
async function getSuppliers(tenantId) {
    const tenantFilter = getTenantFilter(tenantId);
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, contact_info, phone, created_at FROM suppliers WHERE restaurant_id = $1 ORDER BY name ASC',
            [tenantFilter.restaurant_id]
        );
        return {
            status: 200,
            body: { success: true, data: result.rows }
        };
    } finally {
        client.release();
    }
}

// POST: Create a new supplier
async function createSupplier(request, tenantId) {
    const { name, contact_info, phone } = await request.json();

    if (!name || name.trim() === '') {
        return { status: 400, body: { success: false, error: 'Supplier name is required' } };
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO suppliers (restaurant_id, name, contact_info, phone) VALUES ($1, $2, $3, $4) RETURNING *',
            [tenantId, name.trim(), contact_info || null, phone || null]
        );
        return {
            status: 201,
            body: { success: true, data: result.rows[0] }
        };
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return { status: 409, body: { success: false, error: 'Supplier name already exists' } };
        }
        throw error;
    } finally {
        client.release();
    }
}

// Main handler for GET and POST requests
export async function GET({ locals }) {
    try {
        const tenantId = locals.tenantId || 'default';
        const { status, body } = await getSuppliers(tenantId);
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to fetch suppliers:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}

export async function POST({ request, locals }) {
    try {
        const tenantId = locals.tenantId || 'default';
        const { status, body } = await createSupplier(request, tenantId);
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to create supplier:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}
