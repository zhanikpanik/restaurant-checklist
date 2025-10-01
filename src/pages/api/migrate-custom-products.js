import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// POST: Migrate custom products from localStorage to database
export async function POST({ request }) {
    const { customProducts } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    
    try {
        if (!customProducts || !Array.isArray(customProducts)) {
            throw new Error('No custom products provided for migration');
        }

        await client.query('BEGIN');
        
        // Get the "Горничная" department ID
        const deptResult = await client.query(
            'SELECT id FROM departments WHERE name = $1',
            ['Горничная']
        );
        
        if (deptResult.rows.length === 0) {
            throw new Error('Горничная department not found');
        }
        
        const departmentId = deptResult.rows[0].id;
        let migratedCount = 0;
        let skippedCount = 0;
        const errors = [];

        // Migrate each product
        for (const product of customProducts) {
            try {
                // Skip if product already exists
                const existingCheck = await client.query(
                    'SELECT id FROM custom_products WHERE name = $1 AND department_id = $2',
                    [product.name, departmentId]
                );
                
                if (existingCheck.rows.length > 0) {
                    skippedCount++;
                    continue;
                }

                // Insert the custom product
                await client.query(
                    `INSERT INTO custom_products (name, unit, department_id, min_quantity, current_quantity, is_active) 
                     VALUES ($1, $2, $3, $4, $5, true)`,
                    [
                        product.name,
                        product.unit || 'шт',
                        departmentId,
                        product.minQuantity || 1,
                        product.quantity || 0
                    ]
                );
                
                migratedCount++;
            } catch (productError) {
                errors.push(`${product.name}: ${productError.message}`);
            }
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Custom products migration completed',
            results: {
                total: customProducts.length,
                migrated: migratedCount,
                skipped: skippedCount,
                errors: errors
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error migrating custom products:', error);
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
