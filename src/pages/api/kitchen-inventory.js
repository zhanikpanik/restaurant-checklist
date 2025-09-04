export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍽️ Fetching KITCHEN inventory from Poster storage ID 1...');
        
        // Server-side call to Poster API (no CORS issues)
        const response = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=1`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error (Code ${data.error.code}): ${data.error.message}`);
        }
        
        // Get leftovers directly from response array
        const leftovers = Array.isArray(data.response) ? data.response : [];
        console.log(`✅ Loaded ${leftovers.length} KITCHEN leftovers from Poster storage ID 1`);
        
        // Unit translation map from Poster to Russian abbreviated forms
        const unitTranslation = {
            'pcs': 'шт',
            'pc': 'шт',
            'штук': 'шт',
            'kg': 'кг',
            'килограмм': 'кг',
            'g': 'г',
            'грамм': 'г',
            'l': 'л',
            'литр': 'л',
            'ml': 'мл',
            'миллилитр': 'мл',
            'bottle': 'бут',
            'pack': 'упак',
            'упаковка': 'упак',
            'can': 'банка',
            'банка': 'банка',
            'box': 'коробка'
        };

        // Transform data to our format using the correct field names
        const kitchenProducts = leftovers.map(leftover => {
            const originalUnit = leftover.ingredient_unit || 'шт';
            const translatedUnit = unitTranslation[originalUnit.toLowerCase()] || originalUnit;
            
            return {
                id: leftover.ingredient_id,
                name: leftover.ingredient_name || '',
                quantity: parseFloat(leftover.storage_ingredient_left) || 0,
                unit: translatedUnit,
                minQuantity: 1,
                checked: false,
                primeCost: parseFloat(leftover.prime_cost) || 0,
                primeCostNetto: parseFloat(leftover.prime_cost_netto) || 0,
                ingredientLeft: parseFloat(leftover.ingredient_left) || 0,
                storageIngredientLeft: parseFloat(leftover.storage_ingredient_left) || 0,
                storageSum: parseFloat(leftover.storage_ingredient_sum) || 0,
                hidden: leftover.hidden === "1"
            };
        });
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: kitchenProducts,
            storage: { id: 1, name: 'кухня', itemCount: kitchenProducts.length }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch KITCHEN leftovers:', error);
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