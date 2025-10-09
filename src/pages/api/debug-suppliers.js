import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        // Check products with categories
        const productsResult = await client.query(`
            SELECT
                p.id,
                p.name as product_name,
                p.category_id,
                pc.name as category_name,
                pc.supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            WHERE p.restaurant_id = $1
            LIMIT 20
        `, [tenantId]);

        // Check section_products with categories
        const sectionProductsResult = await client.query(`
            SELECT
                sp.id,
                sp.name as product_name,
                sp.category_id,
                pc.name as category_name,
                pc.supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone
            FROM section_products sp
            LEFT JOIN product_categories pc ON sp.category_id = pc.id
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            LEFT JOIN sections sec ON sp.section_id = sec.id
            WHERE sec.restaurant_id = $1 AND sp.is_active = true
            LIMIT 20
        `, [tenantId]);

        // Check categories with suppliers
        const categoriesResult = await client.query(`
            SELECT
                pc.id,
                pc.name as category_name,
                pc.supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            WHERE pc.restaurant_id = $1
        `, [tenantId]);

        // Check suppliers
        const suppliersResult = await client.query(`
            SELECT id, name, phone, contact_info
            FROM suppliers
            WHERE restaurant_id = $1
        `, [tenantId]);

        return new Response(JSON.stringify({
            success: true,
            data: {
                products: productsResult.rows,
                section_products: sectionProductsResult.rows,
                categories: categoriesResult.rows,
                suppliers: suppliersResult.rows
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Debug error:', error);
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
