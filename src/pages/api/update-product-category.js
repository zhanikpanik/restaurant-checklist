import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * PUT: Update product category
 * Body: { productId, categoryId, productType: 'section' | 'custom' }
 */
export async function PUT({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const body = await request.json();
        const { productId, categoryId, productType } = body;

        if (!productId || !productType) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate category belongs to this restaurant
        if (categoryId) {
            const categoryCheck = await client.query(
                'SELECT id FROM product_categories WHERE id = $1 AND restaurant_id = $2',
                [categoryId, tenantId]
            );

            if (categoryCheck.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Category not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Update the appropriate table
        let updateQuery;
        let updateParams;

        if (productType === 'section') {
            // Verify product belongs to this restaurant
            const productCheck = await client.query(
                'SELECT sp.id FROM section_products sp JOIN sections s ON sp.section_id = s.id WHERE sp.id = $1 AND s.restaurant_id = $2',
                [productId, tenantId]
            );

            if (productCheck.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Product not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            updateQuery = 'UPDATE section_products SET category_id = $1 WHERE id = $2';
            updateParams = [categoryId || null, productId];
        } else if (productType === 'custom') {
            // Verify custom product belongs to this restaurant
            const productCheck = await client.query(
                'SELECT id FROM custom_products WHERE id = $1 AND restaurant_id = $2',
                [productId, tenantId]
            );

            if (productCheck.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Product not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            updateQuery = 'UPDATE custom_products SET category_id = $1 WHERE id = $2';
            updateParams = [categoryId || null, productId];
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid product type'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await client.query(updateQuery, updateParams);

        return new Response(JSON.stringify({
            success: true,
            message: 'Category updated successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to update product category:', error);
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
