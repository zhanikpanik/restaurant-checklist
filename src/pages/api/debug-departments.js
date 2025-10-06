import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// Debug endpoint to see all departments
export async function GET({ request }) {
    const { client, error } = await getDbClient();
    if (error) return error;

    try {
        // Get all departments (even inactive)
        const depts = await client.query(`
            SELECT id, name, emoji, poster_storage_id, restaurant_id, is_active, created_at
            FROM departments
            ORDER BY created_at DESC
        `);

        // Get all restaurants
        const restaurants = await client.query(`
            SELECT id, name, poster_account_name, poster_token IS NOT NULL as has_token
            FROM restaurants
            ORDER BY created_at DESC
        `);

        return new Response(JSON.stringify({
            success: true,
            data: {
                departments: depts.rows,
                restaurants: restaurants.rows,
                total_departments: depts.rows.length,
                active_departments: depts.rows.filter(d => d.is_active).length
            }
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
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
