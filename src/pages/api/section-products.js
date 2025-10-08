import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * GET: Fetch all section products with their category info
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const query = `
            SELECT
                sp.id,
                sp.name,
                sp.unit,
                sp.poster_ingredient_id,
                sp.section_id,
                s.name AS section_name,
                s.emoji AS section_emoji,
                pc.id AS category_id,
                pc.name AS category_name
            FROM section_products sp
            JOIN sections s ON sp.section_id = s.id
            LEFT JOIN product_categories pc ON sp.category_id = pc.id
            WHERE s.restaurant_id = $1 AND sp.is_active = true
            ORDER BY s.name, sp.name ASC;
        `;

        const result = await client.query(query, [tenantId]);

        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to fetch section products:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
