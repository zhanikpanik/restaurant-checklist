export const prerender = false;

export async function GET() {
    const token = '268636:44758873dd5f1ab96c3123f2f4ca45c9';
    const baseUrl = 'https://joinposter.com/api';
    
    try {
        console.log('🧪 Testing storage.createSupply with simple data...');
        
        // Test with one simple ingredient (ID 1 - Боржоми)
        const now = new Date();
        const formattedDate = now.getFullYear() + '-' + 
                             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(now.getDate()).padStart(2, '0') + ' ' + 
                             String(now.getHours()).padStart(2, '0') + ':' + 
                             String(now.getMinutes()).padStart(2, '0') + ':' + 
                             String(now.getSeconds()).padStart(2, '0');

        // Test different approaches
        const tests = [
            // Test 1: With storage_id 1
            {
                name: "Test 1: storage_id 1",
                params: {
                    supply: JSON.stringify({
                        date: formattedDate,
                        supplier_id: "1",
                        storage_id: "1",
                        packing: "1"
                    }),
                    ingredient: JSON.stringify([{
                        id: "1", // Боржоми
                        type: "1",
                        num: "1",
                        sum: "10"
                    }])
                }
            },
            // Test 2: Without storage_id (maybe it's global)
            {
                name: "Test 2: No storage_id",
                params: {
                    supply: JSON.stringify({
                        date: formattedDate,
                        supplier_id: "1",
                        packing: "1"
                    }),
                    ingredient: JSON.stringify([{
                        id: "1", // Боржоми
                        type: "1",
                        num: "1",
                        sum: "10"
                    }])
                }
            }
        ];
        
        const results = [];
        
        for (const test of tests) {
            console.log(`🧪 Running ${test.name}...`);
            console.log('📤 Request params:', test.params);
            
            try {
                const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(test.params)
                });
                
                const responseText = await response.text();
                console.log(`📥 ${test.name} - Status: ${response.status}, Response (${responseText.length} chars):`, responseText);
                
                let result = {
                    testName: test.name,
                    status: response.status,
                    statusText: response.statusText,
                    rawResponse: responseText,
                    rawResponseLength: responseText.length,
                    requestParams: test.params
                };
                
                if (responseText && responseText.trim()) {
                    try {
                        result.parsedResponse = JSON.parse(responseText);
                    } catch (e) {
                        result.parseError = e.message;
                    }
                }
                
                results.push(result);
                
            } catch (error) {
                results.push({
                    testName: test.name,
                    error: error.message,
                    requestParams: test.params
                });
            }
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: results,
            message: `Completed ${results.length} tests`
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