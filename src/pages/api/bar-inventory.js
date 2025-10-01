import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// Helper function to save categories to our database
async function saveCategoriesToDb(categories) {
    if (!categories || categories.size === 0) return;

    const { client, error } = await getDbClient();


    if (error) return error;

    try {
        await client.query('BEGIN');
        const query = `
            INSERT INTO product_categories (name, poster_category_id)
            VALUES ($1, $2)
            ON CONFLICT (poster_category_id) DO NOTHING;
        `;
        for (const [id, name] of categories) {
            await client.query(query, [name, id]);
        }
        await client.query('COMMIT');
        console.log(`💾 Synced ${categories.size} categories to the database.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error saving categories to DB:', error);
    } finally {
        safeRelease(client);
    }
}

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍷 Fetching BAR inventory and ingredient details from Poster...');

        // 1. Fetch all ingredient details (including categories)
        const ingredientsDetailsRes = await fetch(`${baseUrl}/menu.getIngredients?token=${token}`);
        const ingredientsDetailsData = await ingredientsDetailsRes.json();
        if (ingredientsDetailsData.error) throw new Error(`Poster API error (getIngredients): ${ingredientsDetailsData.error.message}`);
        
        const allIngredients = ingredientsDetailsData.response;
        const ingredientMap = new Map(allIngredients.map(ing => [ing.ingredient_id, ing]));
        console.log(`✅ Loaded details for ${allIngredients.length} ingredients.`);

        // 2. Fetch inventory leftovers for the BAR storage
        const leftoversRes = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=2`);
        const leftoversData = await leftoversRes.json();
        if (leftoversData.error) throw new Error(`Poster API error (getStorageLeftovers): ${leftoversData.error.message}`);
        
        const leftovers = leftoversData.response || [];
        console.log(`✅ Loaded ${leftovers.length} BAR leftovers from Poster.`);

        // 3. Extract unique categories and save them to our database
        const uniqueCategories = new Map();
        allIngredients.forEach(ing => {
            if (ing.category_id && ing.category_name) {
                uniqueCategories.set(ing.category_id, ing.category_name);
            }
        });
        await saveCategoriesToDb(uniqueCategories);

        // Unit translation map
        const unitTranslation = {
            'pcs': 'шт', 'pc': 'шт', 'штук': 'шт', 'kg': 'кг', 'килограмм': 'кг', 'g': 'г', 'грамм': 'г',
            'l': 'л', 'литр': 'л', 'ml': 'мл', 'миллилитр': 'мл', 'bottle': 'бут', 'бутылка': 'бут',
            'pack': 'упак', 'упаковка': 'упак', 'can': 'банка', 'box': 'коробка'
        };

        // 4. Combine leftovers with ingredient details
        const barProducts = leftovers.map(leftover => {
            const detail = ingredientMap.get(leftover.ingredient_id);
            const originalUnit = leftover.ingredient_unit || 'шт';
            const translatedUnit = unitTranslation[originalUnit.toLowerCase()] || originalUnit;
            
            return {
                id: parseInt(leftover.ingredient_id),
                name: leftover.ingredient_name,
                quantity: parseFloat(leftover.ingredient_left) || 0,
                unit: translatedUnit,
                minQuantity: 1, // You might want to get this from Poster later
                category_id: detail ? parseInt(detail.category_id) : null,
                category_name: detail ? detail.category_name : 'Без категории',
            };
        });
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: barProducts,
            storage: { id: 2, name: 'бар', itemCount: barProducts.length }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch BAR leftovers:', error);
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