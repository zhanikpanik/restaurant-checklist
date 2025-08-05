export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    const debugData = {
        token: token,
        finalTests: []
    };
    
    // Test with ingredients that exist in kitchen storage (ID 1)
    const kitchenIngredients = [
        { id: "439", name: "Aroy кисло сладкий соус", storage: "1 (kitchen)" },
        { id: "370", name: "Coca Cola", storage: "1 (kitchen)" },
        { id: "371", name: "Corona Extra", storage: "1 (kitchen)" }
    ];
    
    for (const ingredient of kitchenIngredients) {
        const testParams = {
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            supplier_id: "4",
            storage_id: "1", // Kitchen storage instead of bar
            supply_comment: `Kitchen test: ${ingredient.name}`,
            ingredients: JSON.stringify([{
                id: ingredient.id,
                type: 4,
                num: "0.1", // Very small quantity
                sum: "0.10"
            }])
        };
        
        try {
            console.log(`🧪 Testing ${ingredient.name} in kitchen storage`);
            
            const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(testParams)
            });
            
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { parseError: e.message, rawText: responseText };
            }
            
            debugData.finalTests.push({
                ingredient: ingredient,
                testParams: testParams,
                status: response.status,
                ok: response.ok,
                responseData: responseData,
                success: responseData.success === 1 && responseData.response !== false,
                actualResponse: responseData.response,
                hasSupplyId: responseData.response && responseData.response !== false
            });
            
            console.log(`📥 ${ingredient.name}: ${response.status}, response:`, responseData);
            
            if (responseData.success === 1 && responseData.response !== false) {
                console.log(`🎉 SUCCESS! Created supply ID: ${responseData.response} for ${ingredient.name} in kitchen`);
                break; // Stop testing once we find a working combination
            }
            
        } catch (error) {
            debugData.finalTests.push({
                ingredient: ingredient,
                error: error.message,
                testParams: testParams
            });
        }
    }
    
    // Also test checking account permissions via a different endpoint
    try {
        console.log(`🔍 Checking account permissions...`);
        
        const permResponse = await fetch(`${baseUrl}/application.getConfig?token=${token}`, {
            method: 'GET'
        });
        
        const permText = await permResponse.text();
        let permData;
        
        try {
            permData = JSON.parse(permText);
        } catch (e) {
            permData = { parseError: e.message, rawText: permText };
        }
        
        debugData.accountPermissions = {
            status: permResponse.status,
            ok: permResponse.ok,
            responseData: permData
        };
        
    } catch (error) {
        debugData.accountPermissions = {
            error: error.message
        };
    }
    
    // Summary and recommendations
    debugData.summary = {
        allTestsFailed: debugData.finalTests.every(test => !test.success),
        recommendation: "If all tests fail with 'response: false', this indicates either:\n1. Account doesn't have permission to create supplies\n2. Suppliers need activation in Poster admin\n3. Storage settings prevent supply creation\n4. API endpoint requires additional workflow steps"
    };
    
    return new Response(JSON.stringify(debugData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}