export const prerender = false;

export async function GET() {
    const token = '305185:07928627ec76d09e589e1381710e55da';
    const baseUrl = 'https://joinposter.com/api';
    
    const debugData = {
        token: token,
        tests: []
    };
    
    // Get ingredients from menu (correct source for supply creation)
    try {
        console.log(`🔍 Getting all ingredients from menu.getIngredients...`);
        
        const response = await fetch(`${baseUrl}/menu.getIngredients?token=${token}`, {
            method: 'GET'
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { parseError: e.message, rawText: responseText };
        }
        
        const menuInfo = {
            source: 'menu.getIngredients',
            status: response.status,
            ok: response.ok,
            ingredientCount: 0,
            ingredients: []
        };
        
        if (responseData.response && Array.isArray(responseData.response)) {
            menuInfo.ingredientCount = responseData.response.length;
            
            // Filter for valid ingredients (handle missing delete/hidden fields)
            const validIngredients = responseData.response.filter(ing => 
                (ing.delete === undefined || ing.delete === 0) && 
                (ing.hidden === undefined || ing.hidden === 0) && 
                ing.ingredients_type === 1
            );
            
            menuInfo.validIngredientCount = validIngredients.length;
            menuInfo.ingredients = responseData.response.slice(0, 15).map(ing => ({
                id: ing.ingredient_id,
                name: ing.ingredient_name,
                unit: ing.ingredient_unit,
                type: ing.ingredients_type,
                deleted: ing.delete,
                hidden: ing.hidden,
                // Show raw values for debugging
                rawDelete: ing.delete,
                rawHidden: ing.hidden,
                rawType: ing.ingredients_type,
                deleteType: typeof ing.delete,
                hiddenType: typeof ing.hidden,
                typeType: typeof ing.ingredients_type,
                isValid: (ing.delete === undefined || ing.delete === 0) && (ing.hidden === undefined || ing.hidden === 0) && ing.ingredients_type === 1,
                // Try string comparison too
                isValidString: (ing.delete === undefined || ing.delete === "0") && (ing.hidden === undefined || ing.hidden === "0") && ing.ingredients_type === "1"
            }));
            
            menuInfo.validIngredients = validIngredients.slice(0, 10).map(ing => ({
                id: ing.ingredient_id,
                name: ing.ingredient_name,
                unit: ing.ingredient_unit
            }));
        }
        
        debugData.menuIngredients = menuInfo;
        console.log(`✅ Menu ingredients: Found ${menuInfo.ingredientCount} ingredients`);
        
    } catch (error) {
        debugData.menuIngredients = {
            source: 'menu.getIngredients',
            error: error.message
        };
    }

    // Also check current inventory levels for comparison
    for (const storageId of ['1', '2']) {
        try {
            console.log(`🔍 Checking inventory levels in storage ${storageId}...`);
            
            const response = await fetch(`${baseUrl}/storage.getInventoryIngredients?token=${token}&storage_id=${storageId}`, {
                method: 'GET'
            });
            
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { parseError: e.message, rawText: responseText };
            }
            
            const storageInfo = {
                storageId: storageId,
                source: 'storage.getInventoryIngredients',
                status: response.status,
                ok: response.ok,
                ingredientCount: 0,
                ingredients: []
            };
            
            if (responseData.response && Array.isArray(responseData.response.ingredients)) {
                storageInfo.ingredientCount = responseData.response.ingredients.length;
                storageInfo.ingredients = responseData.response.ingredients.slice(0, 10).map(ing => ({
                    id: ing.item_id,
                    name: ing.item,
                    rest: ing.factrest
                }));
            }
            
            debugData.tests.push(storageInfo);
            console.log(`✅ Storage ${storageId}: Found ${storageInfo.ingredientCount} inventory items`);
            
        } catch (error) {
            debugData.tests.push({
                storageId: storageId,
                error: error.message
            });
        }
    }
    
    // Test multiple supply creation scenarios
    if (debugData.menuIngredients && debugData.menuIngredients.validIngredients && debugData.menuIngredients.validIngredients.length > 0) {
        
        // Test 1: Use first VALID ingredient (not deleted, not hidden, type 1)
        const testIngredient = debugData.menuIngredients.validIngredients[0];
        
        debugData.supplyTests = [];
        
        // Test scenario 1: Standard format
        const testParams1 = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "2",
            supply_comment: "Test 1: Standard format",
            ingredients: JSON.stringify([{
                id: testIngredient.id.toString(),
                type: 4,
                num: "0.01",
                sum: "0.01"
            }])
        };
        
        // Test scenario 2: Different quantity format
        const testParams2 = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "2", 
            supply_comment: "Test 2: Different quantity",
            ingredients: JSON.stringify([{
                id: testIngredient.id.toString(),
                type: 4,
                num: "1",
                sum: "1.00"
            }])
        };
        
        // Test scenario 3: Kitchen storage instead
        const testParams3 = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "1", // Try kitchen storage
            supply_comment: "Test 3: Kitchen storage",
            ingredients: JSON.stringify([{
                id: testIngredient.id.toString(),
                type: 4,
                num: "0.01",
                sum: "0.01"
            }])
        };
        
        // Test scenario 4: Different date format
        const testParams4 = {
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            supplier_id: "4",
            storage_id: "2",
            supply_comment: "Test 4: ISO date format",
            ingredients: JSON.stringify([{
                id: testIngredient.id.toString(),
                type: 4,
                num: "0.01",
                sum: "0.01"
            }])
        };
        
        // Test scenario 5: Single ingredient parameter (not array)
        const testParams5 = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "2",
            supply_comment: "Test 5: Single ingredient format",
            ingredient: JSON.stringify({
                id: testIngredient.id.toString(),
                type: 4,
                num: "0.01",
                sum: "0.01"
            })
        };
        
        // Test scenario 6: No type parameter
        const testParams6 = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "2",
            supply_comment: "Test 6: No type parameter",
            ingredients: JSON.stringify([{
                id: testIngredient.id.toString(),
                num: "0.01",
                sum: "0.01"
            }])
        };

        const testScenarios = [
            { name: "Standard", params: testParams1 },
            { name: "Different quantity", params: testParams2 },
            { name: "Kitchen storage", params: testParams3 },
            { name: "ISO date format", params: testParams4 },
            { name: "Single ingredient", params: testParams5 },
            { name: "No type parameter", params: testParams6 }
        ];
        
        for (const scenario of testScenarios) {
            try {
                console.log(`🧪 Testing ${scenario.name} with ingredient ID ${testIngredient.id}...`);
                
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
                    testIngredient: testIngredient,
                    testParams: scenario.params,
                    status: response.status,
                    ok: response.ok,
                    responseData: responseData,
                    success: responseData.success === 1 && responseData.response !== false
                });
                
                console.log(`📥 ${scenario.name} result: ${response.status}, response:`, responseData);
                
            } catch (error) {
                debugData.supplyTests.push({
                    scenario: scenario.name,
                    error: error.message,
                    testParams: scenario.params
                });
            }
        }
        
    }
    
    // FALLBACK: Test with the first ingredient regardless of validation status
    if (debugData.menuIngredients && debugData.menuIngredients.ingredients && debugData.menuIngredients.ingredients.length > 0) {
        const fallbackIngredient = debugData.menuIngredients.ingredients[0]; // Use first ingredient regardless of status
        
        if (!debugData.supplyTests) {
            debugData.supplyTests = [];
        }
        
        const fallbackParams = {
            date: '2025-08-05 12:00:00',
            supplier_id: "4",
            storage_id: "2",
            supply_comment: "Fallback test (ignore validation)",
            ingredients: JSON.stringify([{
                id: fallbackIngredient.id.toString(),
                type: 4,
                num: "0.01",
                sum: "0.01"
            }])
        };
        
        try {
            console.log(`🧪 Fallback test with ingredient ID ${fallbackIngredient.id} (ignoring validation)...`);
            
            const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(fallbackParams)
            });
            
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { parseError: e.message, rawText: responseText };
            }
            
            debugData.supplyTests.push({
                scenario: "Fallback (ignore validation)",
                testIngredient: fallbackIngredient,
                testParams: fallbackParams,
                status: response.status,
                ok: response.ok,
                responseData: responseData,
                success: responseData.success === 1 && responseData.response !== false
            });
            
            console.log(`📥 Fallback result: ${response.status}, response:`, responseData);
            
        } catch (error) {
            debugData.supplyTests.push({
                scenario: "Fallback (ignore validation)",
                error: error.message,
                testParams: fallbackParams
            });
        }
    }
    
    return new Response(JSON.stringify(debugData, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}