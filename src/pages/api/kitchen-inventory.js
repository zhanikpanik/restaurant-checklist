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
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        const ingredients = data.response || [];
        console.log(`✅ Loaded ${ingredients.length} KITCHEN leftovers from Poster storage ID 1`);
        
        // Transform data to our format
        const kitchenProducts = ingredients.map(ingredient => ({
            id: parseInt(ingredient.ingredient_id),
            name: ingredient.ingredient_name,
            quantity: parseFloat(ingredient.ingredient_left) || 0,
            unit: ingredient.ingredient_unit || 'шт',
            minQuantity: 1,
            checked: false,
            estimatedRest: 0,
            primeCost: 0,
            difference: 0
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