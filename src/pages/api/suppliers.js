import pool from '../../lib/db.js';

export const prerender = false;

// GET: Fetch all suppliers
async function getSuppliers() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM suppliers ORDER BY name ASC');
        return {
            status: 200,
            body: { success: true, data: result.rows }
        };
    } finally {
        client.release();
    }
}

// POST: Create a new supplier
async function createSupplier(request) {
    const { name, contact_info } = await request.json();
    if (!name) {
        return { status: 400, body: { success: false, error: 'Supplier name is required' } };
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO suppliers(name, contact_info) VALUES($1, $2) RETURNING *',
            [name, contact_info]
        );
        return {
            status: 201,
            body: { success: true, data: result.rows[0] }
        };
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return { status: 409, body: { success: false, error: 'A supplier with this name already exists.' } };
        }
        throw error;
    } finally {
        client.release();
    }
}

// Main handler for GET and POST requests
export async function GET() {
    try {
        const { status, body } = await getSuppliers();
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to fetch suppliers:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const { status, body } = await createSupplier(request);
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to create supplier:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}
