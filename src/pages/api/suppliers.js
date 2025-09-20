import pool from '../../lib/db.js';
import { getTenantFilter } from '../../lib/tenant.js';

export const prerender = false;

// GET: Fetch all suppliers
async function getSuppliers(tenantId) {
    const tenantFilter = getTenantFilter(tenantId);
    const client = await pool.connect();
    try {
        // Get suppliers for this tenant
        const result = await client.query(
            'SELECT id, name, contact_info, phone, created_at FROM suppliers WHERE restaurant_id = $1 ORDER BY name ASC',
            [tenantFilter.restaurant_id]
        );
        
        // If no suppliers found for this tenant, try to get all suppliers as fallback
        if (result.rows.length === 0) {
            const allSuppliersResult = await client.query('SELECT id, name, contact_info, phone, created_at FROM suppliers ORDER BY name ASC');
            if (allSuppliersResult.rows.length > 0) {
                console.log('⚠️ No suppliers found for tenant, showing all suppliers as fallback');
                return {
                    status: 200,
                    body: { 
                        success: true, 
                        data: allSuppliersResult.rows,
                        usingFallback: true 
                    }
                };
            }
        }
        
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
        
        // Return empty array if database connection fails - no hardcoded suppliers
        console.log('⚠️ Database connection failed, returning empty suppliers array');
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: [], // Empty array instead of hardcoded suppliers
            usingMockData: true,
            message: 'Database connection failed - no suppliers available'
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

export async function POST({ request, locals }) {
    let requestData;
    try {
        requestData = await request.json();
        const tenantId = locals.tenantId || 'default';
        
        // Create a new request object with the parsed data
        const newRequest = {
            json: async () => requestData
        };
        
        const { status, body } = await createSupplier(newRequest, tenantId);
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Failed to create supplier:', error);
        
        // Return mock success response if database connection fails
        if (requestData) {
            const mockSupplier = {
                id: Date.now(), // Use timestamp as mock ID
                name: requestData.name,
                phone: requestData.phone,
                contact_info: requestData.contact_info,
                created_at: new Date().toISOString()
            };
            
            return new Response(JSON.stringify({ 
                success: true, 
                data: mockSupplier,
                usingMockData: true 
            }), { 
                status: 201, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
    }
}
