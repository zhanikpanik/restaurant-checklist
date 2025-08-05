export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    const debugData = {
        token: token,
        testIngredient: {
            id: 370,  // Coca Cola
            name: "Coca Cola"
        },
        parameterTests: []
    };
    
    // Test different parameter combinations
    const testCases = [
        {
            name: "Minimal + date",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1"
                }])
            }
        },
        {
            name: "Add sum parameter",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Different date format (YYYY-MM-DD)",
            params: {
                date: '2025-08-05',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Unix timestamp",
            params: {
                date: Math.floor(Date.now() / 1000).toString(),
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Current date/time",
            params: {
                date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Past date",
            params: {
                date: '2025-01-01 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "All required fields",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                supply_comment: "Test supply",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Type 1 (ingredient type)",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 1,
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Decimal quantity",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "0.5",
                    sum: "0.50"
                }])
            }
        },
        {
            name: "No sum, with type",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "1"
                }])
            }
        }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`🧪 Testing: ${testCase.name}`);
            
            const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(testCase.params)
            });
            
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { parseError: e.message, rawText: responseText };
            }
            
            debugData.parameterTests.push({
                testCase: testCase.name,
                testParams: testCase.params,
                status: response.status,
                ok: response.ok,
                responseData: responseData,
                success: responseData.success === 1 && responseData.response !== false,
                actualResponse: responseData.response,
                errorMessage: responseData.error ? `Error ${responseData.error}: ${responseData.message}` : null,
                hasSupplyId: responseData.response && responseData.response !== false
            });
            
            console.log(`📥 ${testCase.name}: ${response.status}, response:`, responseData);
            
            // If we get a successful response, log it prominently
            if (responseData.success === 1 && responseData.response !== false) {
                console.log(`🎉 SUCCESS! ${testCase.name} created supply ID: ${responseData.response}`);
            }
            
        } catch (error) {
            debugData.parameterTests.push({
                testCase: testCase.name,
                error: error.message,
                testParams: testCase.params
            });
        }
    }
    
    return new Response(JSON.stringify(debugData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}