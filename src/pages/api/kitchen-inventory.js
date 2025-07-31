export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍽️ Fetching KITCHEN inventory from Poster storage ID 1...');
        
        // Server-side call to Poster API (no CORS issues)
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=1`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        const ingredients = data.response?.ingredients || [];
        console.log(`✅ Loaded ${ingredients.length} KITCHEN ingredients from Poster storage ID 1`);
        
        // Transform data to our format
        const kitchenProducts = ingredients.map(ingredient => ({
            id: ingredient.item_id,
            name: ingredient.item.replace(' (Ingr.)', ''),
            quantity: parseFloat(ingredient.factrest) || 0,
            unit: ingredient.unit || 'шт',
            minQuantity: 1,
            checked: false,
            estimatedRest: parseFloat(ingredient.estimatedrest) || 0,
            primeCost: parseFloat(ingredient.primecost) || 0,
            difference: parseFloat(ingredient.difference) || 0
        }));
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: kitchenProducts,
            storage: { id: 1, name: 'кухня', itemCount: kitchenProducts.length }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch KITCHEN inventory:', error);
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