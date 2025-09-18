import pool from '../../lib/db.js';

export const prerender = false;

// GET: Fetch all categories with their default supplier information
async function getCategories() {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                pc.id, 
                pc.name, 
                pc.default_supplier_id,
                s.name AS supplier_name
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.default_supplier_id = s.id
            ORDER BY pc.name ASC;
        `;
        const result = await client.query(query);
        return {
            status: 200,
            body: { success: true, data: result.rows }
        };
    } finally {
        client.release();
    }
}

// POST: Update the default supplier for a category
async function updateCategorySupplier(request) {
    const { category_id, supplier_id } = await request.json();

    if (category_id === undefined) {
        return { status: 400, body: { success: false, error: 'Category ID is required' } };
    }

    // Use null for 'supplier_id' if it's not provided, to allow unsetting a supplier
    const newSupplierId = supplier_id === undefined ? null : supplier_id;

    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE product_categories SET default_supplier_id = $1 WHERE id = $2 RETURNING *',
            [newSupplierId, category_id]
        );

        if (result.rowCount === 0) {
            return { status: 404, body: { success: false, error: 'Category not found' } };
        }

        return {
            status: 200,
            body: { success: true, data: result.rows[0] }
        };
    } finally {
        client.release();
    }
}

// Main handler for GET and POST requests
export async function GET() {
    try {
        const { status, body } = await getCategories();
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const { status, body } = await updateCategorySupplier(request);
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to update category supplier:', error);
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}
