export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍷 Fetching BAR inventory from Poster storage ID 2...');
        
        // Server-side call to Poster API (no CORS issues)
        const response = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=2`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        const ingredients = data.response || [];
        console.log(`✅ Loaded ${ingredients.length} BAR leftovers from Poster storage ID 2`);
        
        // Transform data to our format
        const barProducts = ingredients.map(ingredient => ({
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