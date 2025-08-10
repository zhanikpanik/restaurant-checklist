export const prerender = false;

export async function GET() {
    const token = '268636:44758873dd5f1ab96c3123f2f4ca45c9';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🧪 Testing various storage endpoints...');
        
        const tests = [
            // Test 1: Check if storages exist/are configured
            {
                name: "1. Get Storages List",
                url: `${baseUrl}/storage.getStorages?token=${token}`,
                method: "GET"
            },
            // Test 2: Check suppliers
            {
                name: "2. Get Suppliers",
                url: `${baseUrl}/storage.getSuppliers?token=${token}`,
                method: "GET"
            },
            // Test 3: Check existing supplies
            {
                name: "3. Get Supplies",
                url: `${baseUrl}/storage.getSupplies?token=${token}`,
                method: "GET"
            },
            // Test 4: Check if we can get storage ingredients for specific storage
            {
                name: "4. Get Storage Ingredients (Storage 1)",
                url: `${baseUrl}/storage.getStorageIngredients?token=${token}&storage_id=1`,
                method: "GET"
            },
            // Test 5: Check menu ingredients (which we know works)
            {
                name: "5. Get Menu Ingredients",
                url: `${baseUrl}/menu.getIngredients?token=${token}`,
                method: "GET"
            }
        ];
        
        const results = [];
        
        for (const test of tests) {
            console.log(`🧪 Running ${test.name}...`);
            
            try {
                const response = await fetch(test.url, {
                    method: test.method
                });
                
                const responseText = await response.text();
                console.log(`📥 ${test.name} - Status: ${response.status}, Response (${responseText.length} chars):`, responseText.substring(0, 200));
                
                let result = {
                    testName: test.name,
                    status: response.status,
                    statusText: response.statusText,
                    rawResponse: responseText,
                    rawResponseLength: responseText.length,
                    url: test.url
                };
                
                if (responseText && responseText.trim()) {
                    try {
                        result.parsedResponse = JSON.parse(responseText);
                        
                        // Extract useful info from response
                        if (result.parsedResponse?.response) {
                            if (Array.isArray(result.parsedResponse.response)) {
                                result.itemCount = result.parsedResponse.response.length;
                            }
                        }
                    } catch (e) {
                        result.parseError = e.message;
                    }
                }
                
                results.push(result);
                
            } catch (error) {
                results.push({
                    testName: test.name,
                    error: error.message,
                    url: test.url
                });
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: results,
            message: `Completed ${results.length} storage endpoint tests`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Test error:', error);
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