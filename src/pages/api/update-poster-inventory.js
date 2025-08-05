export const prerender = false;

export async function POST({ request }) {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
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
        
        // Prepare ingredients array according to Poster API documentation
        const ingredientsArray = purchasedItems.map(item => {
            const quantityToAdd = item.actualQuantity || item.quantity;
            console.log(`📦 Preparing ingredient: ${item.name} (ID: ${item.id}) - ${quantityToAdd} ${item.unit}`);
            
            return {
                id: item.id,
                type: 4, // 4 = ingredient according to documentation
                num: quantityToAdd.toString(),
                sum: "0.01" // Minimal price per unit (required parameter)
            };
        });
        
        // Format date as Y-m-d H:i:s
        const now = new Date();
        const formattedDate = now.getFullYear() + '-' + 
                             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(now.getDate()).padStart(2, '0') + ' ' + 
                             String(now.getHours()).padStart(2, '0') + ':' + 
                             String(now.getMinutes()).padStart(2, '0') + ':' + 
                             String(now.getSeconds()).padStart(2, '0');
        
        // Try different token parameter formats for Poster API
        const requestParams1 = {
            token: token,
            date: formattedDate,
            supplier_id: "1",
            storage_id: storageId.toString(),
            supply_comment: `Поставка из приложения: ${department}`,
            ingredient: JSON.stringify(ingredientsArray)
        };
        
        const requestParams2 = {
            access_token: token,
            date: formattedDate,
            supplier_id: "1",
            storage_id: storageId.toString(),
            supply_comment: `Поставка из приложения: ${department}`,
            ingredient: JSON.stringify(ingredientsArray)
        };
        
        // Try minimal test first - just token
        const requestParamsTest = {
            token: token
        };
        
        // Try different token formats - maybe just the hash part?
        const tokenParts = token.split(':');
        const accountId = tokenParts[0]; // 305185
        const tokenHash = tokenParts[1]; // 07928627ec76d09e589e1381710e55da
        
        const requestParamsAltToken = {
            token: tokenHash, // Just the hash part
            date: formattedDate,
            supplier_id: "1",
            storage_id: storageId.toString(),
            supply_comment: `Поставка из приложения: ${department}`,
            ingredient: JSON.stringify(ingredientsArray)
        };
        
        console.log(`🔍 Token analysis:`);
        console.log(`🔍 Full token: ${token}`);
        console.log(`🔍 Account ID: ${accountId}`);
        console.log(`🔍 Token hash: ${tokenHash}`);
        
        console.log(`📤 Trying different token formats for Poster storage.createSupply`);
        console.log(`📤 Format 1 (token):`, requestParams1);
        console.log(`📤 Format 2 (access_token):`, requestParams2);
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
                    throw new Error(`Request timeout after ${timeoutMs}ms`);
                }
                throw error;
            }
        };
        
        console.log(`🕐 Starting API request to Poster at ${new Date().toISOString()}`);
        
        // FIRST: Test if token works with a simpler API endpoint
        console.log(`🧪 Testing token with simpler Poster API endpoint...`);
        try {
            // Try storage.getInventoryIngredients first - this should work if token is valid
            const simpleTestResponse = await fetchWithTimeout(`${baseUrl}/storage.getInventoryIngredients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ 
                    token: token,
                    storage_id: storageId.toString()
                })
            }, 5000);
            
            const simpleTestText = await simpleTestResponse.text();
            console.log(`🧪 Simple API test response (${simpleTestResponse.status}):`, simpleTestText.substring(0, 200) + '...');
            
            if (simpleTestText.includes('Access token is not defined')) {
                console.log(`❌ TOKEN IS INVALID - Even simple API rejects it`);
                console.log(`🔍 Token being sent: ${token}`);
                console.log(`🔍 This suggests the token itself is wrong or expired`);
            } else if (simpleTestResponse.ok) {
                console.log(`✅ TOKEN IS VALID - Simple API accepts it, issue is with createSupply`);
            } else {
                console.log(`⚠️ Token works but other error: ${simpleTestResponse.status}`);
            }
        } catch (error) {
            console.log(`🧪 Simple API test failed:`, error.message);
        }
        
        // SECOND: Test if token is recognized at all with createSupply minimal request
        console.log(`🧪 Testing token recognition with createSupply minimal request...`);
        try {
            const testResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParamsTest)
            }, 5000);
            
            const testText = await testResponse.text();
            console.log(`🧪 createSupply test response (${testResponse.status}):`, testText);
            
            if (testText.includes('Access token is not defined')) {
                console.log(`❌ Token is not being recognized by createSupply API`);
                console.log(`🔍 Token being sent: ${token.substring(0, 15)}...`);
            } else {
                console.log(`✅ Token seems to be recognized by createSupply (different error or success)`);
            }
        } catch (error) {
            console.log(`🧪 createSupply test failed:`, error.message);
        }
        
        // Try format 1 first (token) with timeout
        let addResponse;
        let successfulFormat = null;
        
        try {
            console.log(`📤 Trying format 1 (token parameter)...`);
            console.log(`📤 URL: ${baseUrl}/storage.createSupply`);
            console.log(`📤 Body: ${new URLSearchParams(requestParams1).toString()}`);
            
            addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams1)
            }, 10000);
            
            console.log(`📥 Format 1 response: ${addResponse.status} ${addResponse.statusText}`);
            
            if (addResponse.ok) {
                successfulFormat = "Format 1 (token)";
                console.log(`✅ Format 1 worked! Using token parameter in body.`);
            }
            
        } catch (error) {
            console.error(`❌ Format 1 failed:`, error.message);
            addResponse = null;
        }
        
        // If format 1 fails, try format 2 (access_token)
        if (!addResponse || !addResponse.ok) {
            try {
                console.log(`⚠️ Format 1 failed, trying format 2 (access_token)...`);
                addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(requestParams2)
                }, 10000);
                
                console.log(`📥 Format 2 response: ${addResponse.status} ${addResponse.statusText}`);
                
            } catch (error) {
                console.error(`❌ Format 2 failed:`, error.message);
                addResponse = null;
            }
        }
        
        // If format 2 fails, try token as query parameter
        if (!addResponse || !addResponse.ok) {
            try {
                console.log(`⚠️ Format 2 failed, trying format 3 (query parameter)...`);
                const queryParams = new URLSearchParams({ token: token });
                const bodyParams = new URLSearchParams({
                    date: formattedDate,
                    supplier_id: "1",
                    storage_id: storageId.toString(),
                    supply_comment: `Поставка из приложения: ${department}`,
                    ingredient: JSON.stringify(ingredientsArray)
                });
                
                console.log(`📤 URL: ${baseUrl}/storage.createSupply?${queryParams}`);
                console.log(`📤 Body: ${bodyParams.toString()}`);
                
                addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply?${queryParams}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: bodyParams
                }, 10000);
                
                console.log(`📥 Format 3 response: ${addResponse.status} ${addResponse.statusText}`);
                
                if (addResponse.ok) {
                    successfulFormat = "Format 3 (query parameter)";
                    console.log(`✅ Format 3 worked! Using token as query parameter.`);
                }
                
            } catch (error) {
                console.error(`❌ Format 3 failed:`, error.message);
                addResponse = null;
            }
        }
        
        // If format 3 fails, try token in Authorization header
        if (!addResponse || !addResponse.ok) {
            try {
                console.log(`⚠️ Format 3 failed, trying format 4 (Authorization header)...`);
                const bodyParams4 = new URLSearchParams({
                    date: formattedDate,
                    supplier_id: "1",
                    storage_id: storageId.toString(),
                    supply_comment: `Поставка из приложения: ${department}`,
                    ingredient: JSON.stringify(ingredientsArray)
                });
                
                console.log(`📤 URL: ${baseUrl}/storage.createSupply`);
                console.log(`📤 Headers: Authorization: Bearer ${token.substring(0, 10)}...`);
                console.log(`📤 Body: ${bodyParams4.toString()}`);
                
                addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${token}`
                    },
                    body: bodyParams4
                }, 10000);
                
                console.log(`📥 Format 4 response: ${addResponse.status} ${addResponse.statusText}`);
                
                if (addResponse.ok) {
                    successfulFormat = "Format 4 (Authorization header)";
                    console.log(`✅ Format 4 worked! Using token in Authorization header.`);
                }
                
            } catch (error) {
                console.error(`❌ Format 4 failed:`, error.message);
                addResponse = null;
            }
        }
        
        // If format 4 fails, try token hash only (without account ID)
        if (!addResponse || !addResponse.ok) {
            try {
                console.log(`⚠️ Format 4 failed, trying format 5 (token hash only)...`);
                console.log(`📤 URL: ${baseUrl}/storage.createSupply`);
                console.log(`📤 Body: ${new URLSearchParams(requestParamsAltToken).toString()}`);
                
                addResponse = await fetchWithTimeout(`${baseUrl}/storage.createSupply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(requestParamsAltToken)
                }, 10000);
                
                console.log(`📥 Format 5 response: ${addResponse.status} ${addResponse.statusText}`);
                
                if (addResponse.ok) {
                    successfulFormat = "Format 5 (token hash only)";
                    console.log(`✅ Format 5 worked! Using token hash without account ID.`);
                }
                
            } catch (error) {
                console.error(`❌ Format 5 failed:`, error.message);
                throw new Error(`All token formats failed. Last error: ${error.message}`);
            }
        }
        
        // Final check
        if (!addResponse) {
            throw new Error('All API request attempts failed');
        }
        
        console.log(`🕐 API request completed at ${new Date().toISOString()}`);
        console.log(`✅ Used ${successfulFormat || 'Unknown format'} for successful HTTP response`);
        
        // Check if response is ok
        if (!addResponse.ok) {
            const errorText = await addResponse.text();
            console.error(`❌ HTTP Error from Poster:`, errorText);
            throw new Error(`HTTP ${addResponse.status}: ${errorText}`);
        }
        
        // Parse response
        const responseText = await addResponse.text();
        console.log(`📥 Raw Poster response:`, responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ JSON Parse Error:`, parseError);
            console.error(`Raw response that failed to parse:`, responseText);
            throw new Error(`Invalid JSON response from Poster: ${responseText.substring(0, 100)}...`);
        }
        
        console.log(`📥 Parsed Poster response:`, responseData);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Check if API call was successful (success: 1 = success, 0 = failure)
        if (responseData.success === 1) {
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
            });
            successCount = purchasedItems.length;
            
        } else {
            // API returned error - properly handle error object
            console.error(`❌ Poster API error response:`, responseData);
            
            let errorMessage = 'Unknown Poster API error';
            
            // Extract error details from the response
            if (responseData.error) {
                if (typeof responseData.error === 'string') {
                    errorMessage = responseData.error;
                } else if (typeof responseData.error === 'object') {
                    // Handle error object - convert to readable string
                    errorMessage = JSON.stringify(responseData.error, null, 2);
                    console.error(`❌ Error object details:`, responseData.error);
                }
            } else if (responseData.message) {
                errorMessage = responseData.message;
            }
            
            // Log the full response for debugging
            console.error(`❌ Full Poster response for debugging:`, JSON.stringify(responseData, null, 2));
            
            purchasedItems.forEach(item => {
                const quantityToAdd = item.actualQuantity || item.quantity;
                results.push({
                    item: item.name,
                    quantity: quantityToAdd,
                    unit: item.unit,
                    success: false,
                    error: `Poster API error: ${errorMessage}`
                });
            });
            errorCount = purchasedItems.length;
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