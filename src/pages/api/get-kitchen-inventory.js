export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🍳 Fetching KITCHEN inventory from Poster storage ID 1...');
        
        // Get Kitchen-specific inventory using storage.getInventoryIngredients with storage_id=1
        const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=1`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        // FIXED: Use data.response.ingredients (not data.response)
        const ingredients = data.response?.ingredients || [];
        console.log(`✅ Loaded ${ingredients.length} KITCHEN ingredients from Poster storage ID 1`);
        
        // FIXED: Use correct field names from inventory data
        const kitchenProducts = ingredients.map(ingredient => ({
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
        
        console.log(`✅ Kitchen products:`, kitchenProducts.map(p => p.name));
        
        return new Response(JSON.stringify({
            success: true,
            message: `Loaded ${kitchenProducts.length} kitchen products from Poster storage ID 1`,
            data: kitchenProducts,
            source: 'poster_storage_inventory_id_1',
            storage: {
                id: 1,
                name: 'Кухня',
                itemCount: kitchenProducts.length
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch KITCHEN inventory:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to load kitchen inventory from Poster',
            data: []
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
} 