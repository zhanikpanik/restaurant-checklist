export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    const debugData = {
        token: token,
        testIngredient: {
            id: 370,  // Coca Cola - exists in BOTH storages
            name: "Coca Cola"
        },
        supplyTests: []
    };
    
    // Test scenarios with Coca Cola (ID 370) which exists in both storages
    const testScenarios = [
        {
            name: "Coca Cola - Bar storage",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2", // Bar storage
                supply_comment: "Test: Coca Cola to Bar",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Coca Cola - Kitchen storage", 
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "1", // Kitchen storage
                supply_comment: "Test: Coca Cola to Kitchen",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "No sum parameter",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                supply_comment: "Test: No sum parameter",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 4,
                    num: "1"
                }])
            }
        },
        {
            name: "Type 1 instead of 4",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                supply_comment: "Test: Type 1",
                ingredients: JSON.stringify([{
                    id: "370",
                    type: 1,
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "No type at all",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                supply_comment: "Test: No type",
                ingredients: JSON.stringify([{
                    id: "370",
                    num: "1",
                    sum: "1.00"
                }])
            }
        },
        {
            name: "Integer instead of string",
            params: {
                date: '2025-08-05 12:00:00',
                supplier_id: "4",
                storage_id: "2",
                supply_comment: "Test: Integer values",
                ingredients: JSON.stringify([{
                    id: 370,  // Number instead of string
                    type: 4,
                    num: 1,   // Number instead of string
                    sum: 1.00 // Number instead of string
                }])
            }
        }
    ];
    
    for (const scenario of testScenarios) {
        try {
            console.log(`🧪 Testing: ${scenario.name}`);
            
            const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(scenario.params)
            });
            
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { parseError: e.message, rawText: responseText };
            }
            
            debugData.supplyTests.push({
                scenario: scenario.name,
                testParams: scenario.params,
                status: response.status,
                ok: response.ok,
                responseData: responseData,
                success: responseData.success === 1 && responseData.response !== false,
                actualResponse: responseData.response // Show the actual response value
            });
            
            console.log(`📥 ${scenario.name}: ${response.status}, response:`, responseData);
            
        } catch (error) {
            debugData.supplyTests.push({
                scenario: scenario.name,
                error: error.message,
                testParams: scenario.params
            });
        }
    }
    
    return new Response(JSON.stringify(debugData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}