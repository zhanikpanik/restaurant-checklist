export const prerender = false;

export async function POST({ request }) {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    // Debug token
    console.log('🔑 Token check:', {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 10) + '...'
    });
    
    try {
        const body = await request.json();
        const { purchasedItems, department } = body;
        
        if (!purchasedItems || !Array.isArray(purchasedItems)) {
            throw new Error('purchasedItems is required and must be an array');
        }
        
        console.log(`📦 Updating ${department} inventory in Poster with ${purchasedItems.length} items...`);
        
        // Get storage ID based on department
        const storageId = department === 'kitchen' ? 1 : 2;
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Process each item
        for (const item of purchasedItems) {
            try {
                // Use the actual quantity purchased (if delivery person adjusted it)
                const quantityToAdd = item.actualQuantity || item.quantity;
                
                console.log(`📦 Processing item: ${item.name} (ID: ${item.id})`);
                console.log(`📦 Adding ${quantityToAdd} ${item.unit} to storage ${storageId}`);
                
                // Validate token before using
                if (!token) {
                    throw new Error('Access token is not defined');
                }
                
                // Prepare parameters for Poster API
                const requestParams = {
                    token: token,
                    storage_id: storageId,
                    ingredient_id: item.id,
                    quantity: quantityToAdd.toString(),
                    reason: `Поставка: ${item.name}`,
                    supply_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
                };
                
                console.log(`📤 Sending to Poster:`, requestParams);
                console.log(`🔑 Token being sent:`, token ? `${token.substring(0, 10)}...` : 'UNDEFINED');
                
                // Use the correct Poster API: storage.createSupply
                const addResponse = await fetch(`${baseUrl}/storage.createSupply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(requestParams)
                });
                
                console.log(`📥 Poster response status: ${addResponse.status} ${addResponse.statusText}`);
                
                // Check if response is ok
                if (!addResponse.ok) {
                    const errorText = await addResponse.text();
                    console.error(`❌ HTTP Error from Poster:`, errorText);
                    throw new Error(`HTTP ${addResponse.status}: ${errorText}`);
                }
                
                const responseText = await addResponse.text();
                console.log(`📥 Raw Poster response:`, responseText);
                
                let addResult;
                try {
                    addResult = JSON.parse(responseText);
                } catch (parseError) {
                    console.error(`❌ JSON Parse Error:`, parseError);
                    console.error(`Raw response that failed to parse:`, responseText);
                    throw new Error(`Invalid JSON response from Poster: ${responseText.substring(0, 100)}...`);
                }
                
                console.log(`📥 Parsed Poster response:`, addResult);
                
                if (addResult.error) {
                    // Show descriptive error from Poster API
                    let errorMsg = 'Неизвестная ошибка Poster API';
                    
                    if (typeof addResult.error === 'string') {
                        errorMsg = addResult.error;
                    } else if (addResult.error.message) {
                        errorMsg = addResult.error.message;
                    } else if (addResult.error.code) {
                        errorMsg = `Код ошибки: ${addResult.error.code}`;
                    }
                    
                    console.warn(`⚠️ createSupply failed for ${item.name}:`, addResult.error);
                    throw new Error(`Poster API error for ${item.name}: ${errorMsg}`);
                } else {
                    console.log(`✅ Successfully added ${item.name} to Poster storage`);
                    results.push({
                        item: item.name,
                        quantity: quantityToAdd,
                        unit: item.unit,
                        method: 'createSupply',
                        success: true,
                        result: addResult
                    });
                    successCount++;
                }
                
            } catch (itemError) {
                console.error(`❌ Failed to update ${item.name}:`, itemError);
                const errorMsg = itemError instanceof Error ? itemError.message : String(itemError);
                results.push({
                    item: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    success: false,
                    error: errorMsg || 'Неизвестная ошибка'
                });
                errorCount++;
            }
        }
        
        // Summary
        const summary = {
            department: department,
            storageId: storageId,
            totalItems: purchasedItems.length,
            successCount: successCount,
            errorCount: errorCount,
            results: results
        };
        
        console.log(`✅ Inventory update complete: ${successCount} success, ${errorCount} errors`);
        
        return new Response(JSON.stringify({ 
            success: errorCount === 0,
            message: `Updated ${successCount}/${purchasedItems.length} items in Poster storage ${storageId}`,
            data: summary
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to update Poster inventory:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: errorMessage || 'Неизвестная ошибка сервера',
            data: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}