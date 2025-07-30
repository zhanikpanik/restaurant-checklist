export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍷 Fetching BAR inventory from Poster storage ID 2...');
        
        // Get Bar-specific inventory using storage.getInventoryIngredients with storage_id=2
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        // FIXED: Use data.response.ingredients (not data.response)
        const ingredients = data.response?.ingredients || [];
        console.log(`✅ Loaded ${ingredients.length} BAR ingredients from Poster storage ID 2`);
        
        // FIXED: Use correct field names from inventory data
        const barProducts = ingredients.map(ingredient => ({
            id: ingredient.item_id,
            name: ingredient.item.replace(' (Ingr.)', ''), // Clean up name
            quantity: parseFloat(ingredient.factrest) || 0,
            unit: ingredient.unit || 'шт',
            minQuantity: 1,
            checked: false,
            // Additional inventory data
            estimatedRest: parseFloat(ingredient.estimatedrest) || 0,
            primeCost: parseFloat(ingredient.primecost) || 0,
            difference: parseFloat(ingredient.difference) || 0
        }));
        
        console.log(`✅ Bar products:`, barProducts.map(p => p.name));
        
        return new Response(JSON.stringify({
            success: true,
            message: `Loaded ${barProducts.length} bar products from Poster storage ID 2`,
            data: barProducts,
            source: 'poster_storage_inventory_id_2',
            storage: {
                id: 2,
                name: 'бар',
                itemCount: barProducts.length
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch BAR inventory:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to load bar inventory from Poster',
            data: []
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
} 