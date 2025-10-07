import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId, getPosterConfig } from '../../lib/tenant-manager.js';

export const prerender = false;

// GET: Get combined inventory (Poster + custom products) for a department
export async function GET({ request, url }) {
    const tenantId = getTenantId(request);
    const searchParams = new URL(url).searchParams;
    const departmentName = searchParams.get('department'); // 'bar', 'kitchen', or custom department name

    if (!departmentName) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Department parameter is required'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { client, error } = await getDbClient();


    if (error) return error;


    try {
        // First, get the department info (tenant-specific)
        const deptResult = await client.query(
            'SELECT id, name, emoji, poster_storage_id FROM departments WHERE LOWER(name) = LOWER($1) AND is_active = true AND restaurant_id = $2',
            [departmentName, tenantId]
        );

        if (deptResult.rows.length === 0) {
            throw new Error(`Department "${departmentName}" not found for tenant ${tenantId}`);
        }

        const department = deptResult.rows[0];
        const products = [];

        // Get Poster products if this department has a poster_storage_id
        if (department.poster_storage_id) {
            try {
                // Get tenant-specific Poster configuration
                const posterConfig = await getPosterConfig(tenantId);
                const token = posterConfig.token;
                const baseUrl = posterConfig.baseUrl;

                console.log(`🔄 [${tenantId}] Fetching Poster inventory for ${department.name} (storage ${department.poster_storage_id})...`);
                console.log(`🔑 [${tenantId}] Using token: ${token.substring(0, 10)}...`);
                console.log(`🌐 [${tenantId}] Using baseUrl: ${baseUrl}`);

                // Fetch ingredient details
                const ingredientsRes = await fetch(`${baseUrl}/menu.getIngredients?token=${token}`);
                const ingredientsData = await ingredientsRes.json();
                if (ingredientsData.error) throw new Error(`Poster API error: ${ingredientsData.error.message}`);
                
                const allIngredients = ingredientsData.response;
                const ingredientMap = new Map(allIngredients.map(ing => [ing.ingredient_id, ing]));

                // Fetch inventory leftovers for this storage
                const leftoversRes = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${department.poster_storage_id}`);
                const leftoversData = await leftoversRes.json();
                if (leftoversData.error) throw new Error(`Poster API error: ${leftoversData.error.message}`);
                
                const leftovers = leftoversData.response || [];
                console.log(`✅ Loaded ${leftovers.length} Poster products for ${department.name}`);

                // Unit translation map
                const unitTranslation = {
                    'pcs': 'шт',
                    'l': 'л', 'литр': 'л', 'ml': 'мл', 'миллилитр': 'мл', 'bottle': 'бут', 'бутылка': 'бут',
                    'pack': 'упак', 'упаковка': 'упак', 'can': 'банка', 'box': 'коробка'
                };

                // Save categories to database
                const uniqueCategories = new Map();
                allIngredients.forEach(ing => {
                    if (ing.category_id && ing.category_name) {
                        uniqueCategories.set(ing.category_id, ing.category_name);
                    }
                });
                
                // Save categories to DB (tenant-specific)
                for (const [categoryId, categoryName] of uniqueCategories) {
                    try {
                        await client.query(
                            'INSERT INTO product_categories (name, restaurant_id) VALUES ($1, $2) ON CONFLICT (name, restaurant_id) DO NOTHING',
                            [categoryName, tenantId]
                        );
                    } catch (e) {
                        console.log('Category save error (non-critical):', e.message);
                    }
                }

                // Process Poster products
                leftovers.forEach(leftover => {
                    const detail = ingredientMap.get(leftover.ingredient_id);
                    const originalUnit = leftover.ingredient_unit || 'шт';
                    const translatedUnit = unitTranslation[originalUnit.toLowerCase()] || originalUnit;
                    
                    products.push({
                        id: parseInt(leftover.ingredient_id),
                        name: leftover.ingredient_name,
                        quantity: parseFloat(leftover.ingredient_left || leftover.storage_ingredient_left) || 0,
                        unit: translatedUnit,
                        minQuantity: 1,
                        category_id: detail ? parseInt(detail.category_id) : null,
                        category_name: detail ? detail.category_name : 'Без категории',
                        source: 'poster',
                        department_id: department.id,
                        department_name: department.name
                    });
                });

            } catch (posterError) {
                console.error(`⚠️ Failed to load Poster products for ${department.name}:`, posterError.message);
                // Continue with custom products even if Poster fails
            }
        }

        // Get custom products for this department (tenant-specific)
        const customResult = await client.query(`
            SELECT
                cp.id,
                cp.name,
                cp.unit,
                cp.min_quantity,
                cp.current_quantity as quantity,
                cp.category_id,
                pc.name as category_name
            FROM custom_products cp
            LEFT JOIN product_categories pc ON cp.category_id = pc.id
            WHERE cp.department_id = $1 AND cp.is_active = true AND cp.restaurant_id = $2
            ORDER BY cp.name ASC
        `, [department.id, tenantId]);

        // Add custom products to the list
        customResult.rows.forEach(customProduct => {
            products.push({
                id: `custom_${customProduct.id}`, // Prefix to avoid ID conflicts with Poster
                name: customProduct.name,
                quantity: customProduct.quantity || 0,
                unit: customProduct.unit,
                minQuantity: customProduct.min_quantity,
                category_id: customProduct.category_id,
                category_name: customProduct.category_name || 'Без категории',
                source: 'custom',
                custom_product_id: customProduct.id,
                department_id: department.id,
                department_name: department.name
            });
        });

        console.log(`✅ Combined inventory for ${department.name}: ${products.length} total products (${products.filter(p => p.source === 'poster').length} from Poster, ${products.filter(p => p.source === 'custom').length} custom)`);

        return new Response(JSON.stringify({
            success: true,
            data: products,
            department: {
                id: department.id,
                name: department.name,
                emoji: department.emoji,
                poster_storage_id: department.poster_storage_id,
                total_products: products.length,
                poster_products: products.filter(p => p.source === 'poster').length,
                custom_products: products.filter(p => p.source === 'custom').length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error getting combined inventory:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
