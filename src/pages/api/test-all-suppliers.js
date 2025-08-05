export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    const debugData = {
        token: token,
        testIngredient: {
            id: 370,  // Coca Cola - has 40 pieces in bar storage
            name: "Coca Cola"
        },
        supplierTests: []
    };
    
    // Test all three suppliers with Coca Cola
    const suppliers = [
        { id: "2", name: "ОсОО АКП" },
        { id: "3", name: "Камбаров Аман" },
        { id: "4", name: "Закупка" }
    ];
    
    for (const supplier of suppliers) {
        const testParams = {
            date: '2025-08-05 12:00:00',
            supplier_id: supplier.id,
            storage_id: "2", // Bar storage where Coca Cola has 40 pieces
            supply_comment: `Test: Supplier ${supplier.name}`,
            ingredients: JSON.stringify([{
                id: "370",
                type: 4,
                num: "1",
                sum: "1.00"
            }])
        };
        
        try {
            console.log(`🧪 Testing supplier ${supplier.id} (${supplier.name})`);
            
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
            
            debugData.supplierTests.push({
                supplier: supplier,
                testParams: testParams,
                status: response.status,
                ok: response.ok,
                responseData: responseData,
                success: responseData.success === 1 && responseData.response !== false,
                actualResponse: responseData.response,
                errorMessage: responseData.error ? `Error ${responseData.error}: ${responseData.message}` : null
            });
            
            console.log(`📥 Supplier ${supplier.id}: ${response.status}, response:`, responseData);
            
        } catch (error) {
            debugData.supplierTests.push({
                supplier: supplier,
                error: error.message,
                testParams: testParams
            });
        }
    }
    
    // Also test minimal format without optional parameters
    const minimalParams = {
        supplier_id: "4",
        storage_id: "2",
        ingredients: JSON.stringify([{
            id: "370",
            num: "1"
        }])
    };
    
    try {
        console.log(`🧪 Testing minimal format`);
        
        const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(minimalParams)
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { parseError: e.message, rawText: responseText };
        }
        
        debugData.minimalTest = {
            testParams: minimalParams,
            status: response.status,
            ok: response.ok,
            responseData: responseData,
            success: responseData.success === 1 && responseData.response !== false,
            actualResponse: responseData.response
        };
        
        console.log(`📥 Minimal format: ${response.status}, response:`, responseData);
        
    } catch (error) {
        debugData.minimalTest = {
            error: error.message,
            testParams: minimalParams
        };
    }
    
    return new Response(JSON.stringify(debugData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}