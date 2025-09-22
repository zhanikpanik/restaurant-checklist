import { getTenantId, posterApiRequest } from '../../lib/tenant-manager.js';
import pool from '../../lib/db.js';

export const prerender = false;

/**
 * Multi-tenant inventory API
 * Fetches inventory data using tenant-specific Poster tokens
 */
export async function GET({ request, url }) {
    try {
        const tenantId = getTenantId(request);
        const searchParams = new URL(url).searchParams;
        const department = searchParams.get('department'); // 'kitchen', 'bar', or department name
        const storageId = searchParams.get('storage_id'); // Optional override
        
        console.log(`🏢 Fetching inventory for tenant: ${tenantId}, department: ${department}`);
        
        if (!department) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Department parameter is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get tenant-specific storage configuration
        let targetStorageId = storageId;
        if (!targetStorageId) {
            if (!pool) {
                // Fallback storage IDs
                targetStorageId = department === 'kitchen' ? 1 : department === 'bar' ? 2 : 1;
            } else {
                const client = await pool.connect();
                try {
                    // Get department info with storage ID
                    const deptResult = await client.query(`
                        SELECT poster_storage_id FROM departments 
                        WHERE restaurant_id = $1 AND (LOWER(name) = LOWER($2) OR name = $2)
                        LIMIT 1
                    `, [tenantId, department]);
                    
                    if (deptResult.rows.length > 0 && deptResult.rows[0].poster_storage_id) {
                        targetStorageId = deptResult.rows[0].poster_storage_id;
                    } else {
                        // Fallback to restaurant config
                        const restResult = await client.query(`
                            SELECT kitchen_storage_id, bar_storage_id FROM restaurants 
                            WHERE id = $1
                        `, [tenantId]);
                        
                        if (restResult.rows.length > 0) {
                            const config = restResult.rows[0];
                            targetStorageId = department === 'kitchen' 
                                ? config.kitchen_storage_id 
                                : department === 'bar' 
                                    ? config.bar_storage_id 
                                    : config.kitchen_storage_id;
                        } else {
                            targetStorageId = department === 'kitchen' ? 1 : 2;
                        }
                    }
                } finally {
                    client.release();
                }
            }
        }
        
        console.log(`📦 Using storage ID: ${targetStorageId} for ${department}`);
        
        // Fetch ingredients and inventory using tenant-specific token
        const [ingredients, leftovers] = await Promise.all([
            posterApiRequest('menu.getIngredients', tenantId),
            posterApiRequest('storage.getStorageLeftovers', tenantId, { storage_id: targetStorageId })
        ]);
        
        console.log(`✅ Loaded ${ingredients.length} ingredients and ${leftovers.length} leftovers`);
        
        // Create ingredient map for quick lookup
        const ingredientMap = new Map(ingredients.map(ing => [ing.ingredient_id, ing]));
        
        // Unit translation map
        const unitTranslation = {
            'pcs': 'шт',
            'l': 'л', 'литр': 'л', 'ml': 'мл', 'миллилитр': 'мл', 
            'bottle': 'бут', 'бутылка': 'бут',
            'pack': 'упак', 'упаковка': 'упак', 
            'can': 'банка', 'box': 'коробка',
            'kg': 'кг', 'g': 'г', 'gram': 'г'
        };
        
        // Process inventory data
        const products = leftovers.map(leftover => {
            const ingredient = ingredientMap.get(leftover.ingredient_id);
            if (!ingredient) return null;
            
            const unit = unitTranslation[ingredient.unit] || ingredient.unit || 'шт';
            const quantity = parseFloat(leftover.left) || 0;
            
            return {
                id: parseInt(leftover.ingredient_id),
                name: ingredient.ingredient_name,
                quantity: quantity,
                unit: unit,
                minQuantity: parseFloat(ingredient.min_quantity) || 0,
                category_id: ingredient.category_id ? parseInt(ingredient.category_id) : null,
                category_name: ingredient.category_name || 'Без категории',
                checked: false,
                shoppingQuantity: 0,
                source: 'poster',
                storage_id: targetStorageId,
                tenant_id: tenantId
            };
        }).filter(Boolean);
        
        // Save categories to database if available
        if (pool) {
            try {
                await saveCategoriesForTenant(tenantId, ingredients);
            } catch (error) {
                console.warn('Failed to save categories:', error.message);
            }
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: products,
            meta: {
                tenant_id: tenantId,
                department: department,
                storage_id: targetStorageId,
                total_products: products.length,
                source: 'poster'
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error fetching tenant inventory:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Save categories to database for a specific tenant
 */
async function saveCategoriesForTenant(tenantId, ingredients) {
    if (!pool) return;
    
    const client = await pool.connect();
    try {
        // Extract unique categories
        const uniqueCategories = new Map();
        ingredients.forEach(ing => {
            if (ing.category_id && ing.category_name) {
                uniqueCategories.set(ing.category_id, ing.category_name);
            }
        });
        
        if (uniqueCategories.size === 0) return;
        
        // Insert categories for this tenant
        for (const [categoryId, categoryName] of uniqueCategories) {
            await client.query(`
                INSERT INTO product_categories (id, name, restaurant_id) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (id, restaurant_id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    updated_at = CURRENT_TIMESTAMP
            `, [parseInt(categoryId), categoryName, tenantId]);
        }
        
        console.log(`💾 Saved ${uniqueCategories.size} categories for tenant ${tenantId}`);
        
    } catch (error) {
        console.error('Error saving categories for tenant:', error);
    } finally {
        client.release();
    }
}
