export const prerender = false;

export async function GET() {
    const token = '268636:44758873dd5f1ab96c3123f2f4ca45c9';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🔍 Fetching ALL ingredient IDs from Poster for debugging...');
        
        const results = {
            kitchen: { ingredients: [], error: null },
            bar: { ingredients: [], error: null },
            storageLeftovers: { data: null, error: null },
            allIds: new Set(),
            problematicIds: ['439', '280', '424', '419'],
            foundProblematicIds: [],
            summary: {}
        };
        
        // Fetch Kitchen ingredients (Storage ID 1)
        try {
            const kitchenResponse = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=1`);
            const kitchenData = await kitchenResponse.json();
            
            if (!kitchenData.error && kitchenData.response?.ingredients) {
                results.kitchen.ingredients = kitchenData.response.ingredients.map(ing => ({
                    id: ing.item_id,
                    name: ing.item.replace(' (Ingr.)', ''),
                    unit: ing.unit,
                    quantity: ing.factrest
                }));
                
                // Add to all IDs set
                kitchenData.response.ingredients.forEach(ing => {
                    results.allIds.add(ing.item_id.toString());
                });
                
                console.log(`✅ Kitchen: ${results.kitchen.ingredients.length} ingredients`);
            } else {
                results.kitchen.error = kitchenData.error?.message || 'Unknown error';
            }
        } catch (error) {
            results.kitchen.error = error.message;
        }
        
        // Fetch Bar ingredients (Storage ID 2)
        try {
            const barResponse = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=2`);
            const barData = await barResponse.json();
            
            if (!barData.error && barData.response?.ingredients) {
                results.bar.ingredients = barData.response.ingredients.map(ing => ({
                    id: ing.item_id,
                    name: ing.item.replace(' (Ingr.)', ''),
                    unit: ing.unit,
                    quantity: ing.factrest
                }));
                
                // Add to all IDs set
                barData.response.ingredients.forEach(ing => {
                    results.allIds.add(ing.item_id.toString());
                });
                
                console.log(`✅ Bar: ${results.bar.ingredients.length} ingredients`);
            } else {
                results.bar.error = barData.error?.message || 'Unknown error';
            }
        } catch (error) {
            results.bar.error = error.message;
        }
        
        // Test storage.getStorageLeftovers endpoint
        try {
            console.log('🔍 Testing storage.getStorageLeftovers...');
            const leftoversResponse = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}`);
            const leftoversData = await leftoversResponse.json();
            
            if (!leftoversData.error) {
                results.storageLeftovers.data = leftoversData;
                console.log('✅ StorageLeftovers: Success');
            } else {
                results.storageLeftovers.error = leftoversData.error?.message || leftoversData.error || 'Unknown error';
                console.log('❌ StorageLeftovers error:', results.storageLeftovers.error);
            }
        } catch (error) {
            results.storageLeftovers.error = error.message;
            console.log('❌ StorageLeftovers fetch error:', error.message);
        }
        
        // Check if problematic IDs exist in the system
        results.problematicIds.forEach(id => {
            if (results.allIds.has(id)) {
                results.foundProblematicIds.push(id);
            }
        });
        
        // Create summary
        results.summary = {
            totalIngredients: results.allIds.size,
            kitchenCount: results.kitchen.ingredients.length,
            barCount: results.bar.ingredients.length,
            problematicIdsFound: results.foundProblematicIds,
            problematicIdsMissing: results.problematicIds.filter(id => !results.allIds.has(id)),
            allAvailableIds: Array.from(results.allIds).sort((a, b) => parseInt(a) - parseInt(b))
        };
        
        console.log('🔍 Debug Summary:', results.summary);
        
        return new Response(JSON.stringify({
            success: true,
            data: results,
            message: `Found ${results.allIds.size} total ingredient IDs across both storages`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}