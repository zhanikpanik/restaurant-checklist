export const prerender = false;

export async function POST({ request }) {
    try {
        const { purchasedItems, department } = await request.json();
        
        if (!purchasedItems || !Array.isArray(purchasedItems)) {
            return new Response(JSON.stringify({
                success: false,
                message: "Invalid or missing purchasedItems",
                data: null
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get configuration
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const storageId = department === 'kitchen' ? 1 : 2;
        
        console.log(`🔑 Token check: { tokenExists: ${!!token}, tokenLength: ${token?.length}, tokenStart: '${token?.substring(0, 10)}...' }`);
        console.log(`📦 Updating ${department} inventory in Poster with ${purchasedItems.length} items...`);
        
        // Prepare ingredients array for Poster API
        const ingredientsArray = [];
        
        for (const item of purchasedItems) {
            const quantityToAdd = item.actualQuantity || item.quantity;
            
            console.log(`📦 Preparing ingredient: ${item.name} (ID: ${item.id}) - ${quantityToAdd} ${item.unit}`);
            
            ingredientsArray.push({
                id: item.id.toString(), // Ensure ID is string
                type: 4, // Type 4 for supply
                num: quantityToAdd.toString(),
                sum: "0.01" // Minimal cost for app-generated supplies
            });
        }
        
        // Prepare date in Poster format (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const formattedDate = now.getFullYear() + '-' + 
                             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(now.getDate()).padStart(2, '0') + ' ' + 
                             String(now.getHours()).padStart(2, '0') + ':' + 
                             String(now.getMinutes()).padStart(2, '0') + ':' + 
                             String(now.getSeconds()).padStart(2, '0');
        
        // Use confirmed supplier ID "4" = "Закупка" (Purchase/Procurement)
        const requestParams = {
            date: formattedDate,
            supplier_id: "4", // Confirmed supplier "Закупка"
            storage_id: storageId.toString(),
            supply_comment: `Поставка из приложения: ${department}`,
            ingredients: JSON.stringify(ingredientsArray) // Try 'ingredients' (plural)
        };
        
        console.log(`📤 Using supplier_id="4" (Закупка) for Poster storage.createSupply`);
        console.log(`📤 Request params:`, requestParams);
        console.log(`📤 Ingredients array:`, ingredientsArray);
        
        // Create fetch with timeout wrapper
        const fetchWithTimeout = async (url, options, timeoutMs = 10000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeoutMs}ms`);
                }
                throw error;
            }
        };
        
        console.log(`🕐 Starting API request to Poster at ${new Date().toISOString()}`);
        
        // Create supply in Poster
        let addResponse;
        
        try {
            console.log(`📤 Creating Poster supply with confirmed format...`);
            console.log(`📤 URL: ${baseUrl}/storage.createSupply?token=${token}`);
            console.log(`📤 Body: ${new URLSearchParams(requestParams).toString()}`);
            
            addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            }, 10000);
            
            console.log(`📥 Poster response: ${addResponse.status} ${addResponse.statusText}`);
            
        } catch (error) {
            console.error(`❌ Poster API request failed:`, error.message);
            return new Response(JSON.stringify({
                success: false,
                message: `Network error: ${error.message}`,
                data: null
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`🕐 API request completed at ${new Date().toISOString()}`);
        
        // Parse response
        const responseText = await addResponse.text();
        console.log(`📥 Raw Poster response:`, responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ JSON Parse Error:`, parseError);
            console.error(`Raw response that failed to parse:`, responseText);
            return new Response(JSON.stringify({
                success: false,
                message: `Invalid JSON response from Poster`,
                data: { rawResponse: responseText }
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`📥 Parsed Poster response:`, responseData);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Check Poster API response
        if (responseData.success === 1 && responseData.response !== false) {
            // Success - all items were added as a batch
            console.log(`✅ Supply created successfully with ID: ${responseData.response}`);
            
            purchasedItems.forEach(item => {
                const quantityToAdd = item.actualQuantity || item.quantity;
                results.push({
                    item: item.name,
                    quantity: quantityToAdd,
                    unit: item.unit,
                    success: true,
                    supplyId: responseData.response
                });
                successCount++;
            });
            
        } else if (responseData.success === 1 && responseData.response === false) {
            // API call successful but supply not created (validation issue)
            console.error(`⚠️ Poster API accepted request but did not create supply`);
            console.error(`🔍 This usually means ingredient validation failed`);
            
            purchasedItems.forEach(item => {
                const quantityToAdd = item.actualQuantity || item.quantity;
                results.push({
                    item: item.name,
                    quantity: quantityToAdd,
                    unit: item.unit,
                    success: false,
                    error: `Ingredient validation failed - item may not exist in storage ${storageId} or quantity format invalid`
                });
                errorCount++;
            });
            
        } else {
            // Handle Poster API errors
            const errorMessage = responseData.error || responseData.message || 'Unknown Poster API error';
            console.error(`❌ Poster API error response:`, responseData);
            
            // Create error result for each item
            purchasedItems.forEach(item => {
                const quantityToAdd = item.actualQuantity || item.quantity;
                let errorDetail = errorMessage;
                
                // Format error object for better display
                if (typeof errorMessage === 'object') {
                    errorDetail = JSON.stringify(errorMessage);
                }
                
                results.push({
                    item: item.name,
                    quantity: quantityToAdd,
                    unit: item.unit,
                    success: false,
                    error: `Poster API error: ${errorDetail}`
                });
                errorCount++;
            });
        }
        
        console.log(`✅ Inventory update complete: ${successCount} success, ${errorCount} errors`);
        
        return new Response(JSON.stringify({
            success: successCount > 0,
            message: `Updated ${successCount}/${purchasedItems.length} items in Poster storage ${storageId}`,
            data: {
                department,
                storageId,
                totalItems: purchasedItems.length,
                successCount,
                errorCount,
                results
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Update inventory error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            message: error.message || 'Unknown error occurred',
            data: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}