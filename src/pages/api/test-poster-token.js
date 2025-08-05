export const prerender = false;

export async function GET({ request }) {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    console.log('🧪 TESTING POSTER TOKEN DIRECTLY');
    console.log(`🔑 Token: ${token}`);
    
    const results = {
        token: token,
        tests: []
    };
    
    try {
        // Test 1: Try storage.getInventoryIngredients (should work if token is valid)
        console.log('🧪 Test 1: storage.getInventoryIngredients');
        try {
            const response1 = await fetch(`${baseUrl}/storage.getInventoryIngredients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ 
                    token: token,
                    storage_id: "1"
                })
            });
            
            const text1 = await response1.text();
            const test1Result = {
                test: 'storage.getInventoryIngredients',
                status: response1.status,
                ok: response1.ok,
                response: text1.substring(0, 200),
                tokenRecognized: !text1.includes('Access token is not defined')
            };
            
            console.log('🧪 Test 1 Result:', test1Result);
            results.tests.push(test1Result);
            
        } catch (error) {
            const test1Error = {
                test: 'storage.getInventoryIngredients',
                error: error.message
            };
            console.log('🧪 Test 1 Error:', test1Error);
            results.tests.push(test1Error);
        }
        
        // Test 2: Try storage.createSupply with minimal params
        console.log('🧪 Test 2: storage.createSupply (minimal)');
        try {
            const response2 = await fetch(`${baseUrl}/storage.createSupply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ 
                    token: token
                })
            });
            
            const text2 = await response2.text();
            const test2Result = {
                test: 'storage.createSupply (minimal)',
                status: response2.status,
                ok: response2.ok,
                response: text2.substring(0, 200),
                tokenRecognized: !text2.includes('Access token is not defined')
            };
            
            console.log('🧪 Test 2 Result:', test2Result);
            results.tests.push(test2Result);
            
        } catch (error) {
            const test2Error = {
                test: 'storage.createSupply (minimal)',
                error: error.message
            };
            console.log('🧪 Test 2 Error:', test2Error);
            results.tests.push(test2Error);
        }
        
        // Test 3: Try different token formats
        console.log('🧪 Test 3: Different token formats');
        const tokenParts = token.split(':');
        const alternativeFormats = [
            { name: 'access_token', params: { access_token: token } },
            { name: 'token_hash_only', params: { token: tokenParts[1] } },
            { name: 'account_id_separate', params: { token: tokenParts[1], account_id: tokenParts[0] } }
        ];
        
        for (const format of alternativeFormats) {
            try {
                const response3 = await fetch(`${baseUrl}/storage.createSupply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(format.params)
                });
                
                const text3 = await response3.text();
                const test3Result = {
                    test: `storage.createSupply (${format.name})`,
                    status: response3.status,
                    ok: response3.ok,
                    response: text3.substring(0, 200),
                    tokenRecognized: !text3.includes('Access token is not defined'),
                    params: format.params
                };
                
                console.log(`🧪 Test 3.${format.name} Result:`, test3Result);
                results.tests.push(test3Result);
                
            } catch (error) {
                const test3Error = {
                    test: `storage.createSupply (${format.name})`,
                    error: error.message,
                    params: format.params
                };
                console.log(`🧪 Test 3.${format.name} Error:`, test3Error);
                results.tests.push(test3Error);
            }
        }
        
        console.log('🧪 ALL TESTS COMPLETED');
        console.log('🧪 SUMMARY:', JSON.stringify(results, null, 2));
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Token tests completed',
            data: results
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('🧪 FATAL ERROR:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: results
        }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}