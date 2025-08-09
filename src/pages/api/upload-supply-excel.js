import * as XLSX from 'xlsx';

export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('📤 Processing Excel supply upload...');
        
        const formData = await request.formData();
        const file = formData.get('file');
        const department = formData.get('department') || 'kitchen';
        
        if (!file) {
            throw new Error('No file uploaded');
        }
        
        // Read the Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`📊 Excel file contains ${jsonData.length} rows`);
        
        // Find the header row (look for "Ingredient ID" column)
        let headerRowIndex = -1;
        let ingredientIdColIndex = -1;
        let ingredientNameColIndex = -1;
        let currentStockColIndex = -1;
        let unitColIndex = -1;
        let quantityColIndex = -1;
        let notesColIndex = -1;
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
                const ingredientIdIndex = row.findIndex(cell => 
                    cell && cell.toString().toLowerCase().includes('ingredient id')
                );
                if (ingredientIdIndex !== -1) {
                    headerRowIndex = i;
                    ingredientIdColIndex = ingredientIdIndex;
                    ingredientNameColIndex = row.findIndex(cell => 
                        cell && cell.toString().toLowerCase().includes('ingredient name')
                    );
                    currentStockColIndex = row.findIndex(cell => 
                        cell && cell.toString().toLowerCase().includes('current stock')
                    );
                    unitColIndex = row.findIndex(cell => 
                        cell && cell.toString().toLowerCase().includes('unit')
                    );
                    quantityColIndex = row.findIndex(cell => 
                        cell && cell.toString().toLowerCase().includes('quantity to add')
                    );
                    notesColIndex = row.findIndex(cell => 
                        cell && cell.toString().toLowerCase().includes('notes')
                    );
                    break;
                }
            }
        }
        
        if (headerRowIndex === -1) {
            throw new Error('Could not find header row with "Ingredient ID" column');
        }
        
        console.log(`📋 Found header row at index ${headerRowIndex}`);
        
        // Process data rows (skip header and instruction rows)
        const supplyItems = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (Array.isArray(row) && row.length > 0) {
                const ingredientId = row[ingredientIdColIndex];
                const ingredientName = row[ingredientNameColIndex];
                const quantity = row[quantityColIndex];
                
                // Skip empty rows or rows without ingredient ID
                if (!ingredientId || ingredientId.toString().trim() === '') {
                    continue;
                }
                
                // Only include items with quantity to add
                if (quantity && parseFloat(quantity) > 0) {
                    supplyItems.push({
                        id: ingredientId.toString(),
                        name: ingredientName || '',
                        quantity: parseFloat(quantity),
                        unit: row[unitColIndex] || 'шт',
                        notes: row[notesColIndex] || ''
                    });
                }
            }
        }
        
        console.log(`📦 Found ${supplyItems.length} items to add to supply`);
        
        if (supplyItems.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: 'No items with quantities found in the Excel file'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Create supply using the existing update-poster-inventory logic
        const storageId = department === 'kitchen' ? 3 : 4;
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        
        // Prepare the supply data
        const formattedDate = '2025-08-07 10:00:00'; // Use a fixed date to avoid time issues
        
        const formDataForPoster = new URLSearchParams();
        formDataForPoster.append('date', formattedDate);
        formDataForPoster.append('supplier_id', '1');
        formDataForPoster.append('storage_id', storageId.toString());
        formDataForPoster.append('packing', '1');
        
        supplyItems.forEach((item, index) => {
            formDataForPoster.append(`ingredients[${index}][product_id]`, item.id);
            formDataForPoster.append(`ingredients[${index}][ingredient_id]`, item.id);
            formDataForPoster.append(`ingredients[${index}][type]`, '1');
            formDataForPoster.append(`ingredients[${index}][num]`, item.quantity.toString());
            formDataForPoster.append(`ingredients[${index}][sum]`, '0.01');
        });
        
        console.log(`📤 Creating supply for ${department} with ${supplyItems.length} items...`);
        
        // Call Poster API
        const response = await fetch(`${baseUrl}/storage.createSupply?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formDataForPoster.toString()
        });
        
        const responseText = await response.text();
        console.log(`📥 Poster response: ${responseText}`);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Invalid JSON response from Poster: ${responseText}`);
        }
        
        if (responseData.success === 1 && responseData.response !== false) {
            console.log(`✅ Supply created successfully with ID: ${responseData.response}`);
            
            return new Response(JSON.stringify({
                success: true,
                message: `Supply created successfully with ID: ${responseData.response}`,
                data: {
                    supplyId: responseData.response,
                    department: department,
                    storageId: storageId,
                    itemCount: supplyItems.length,
                    items: supplyItems
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else {
            console.error(`❌ Poster API error:`, responseData);
            
            let errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            
            // Provide more helpful error messages
            if (responseData.error === 32) {
                errorMessage = "Poster API error: Ingredient ID doesn't exist in supply system (Error 32). This may be due to API inconsistencies. Please try again later or contact support.";
            } else if (responseData.error === 46) {
                errorMessage = "Poster API error: Inventory time restriction (Error 46). Please try again later.";
            } else if (responseData.error === 44) {
                errorMessage = "Poster API error: Supply date exceeds current date (Error 44). Please try again with a past date.";
            }
            
            return new Response(JSON.stringify({
                success: false,
                message: errorMessage,
                data: {
                    department: department,
                    storageId: storageId,
                    itemCount: supplyItems.length,
                    items: supplyItems,
                    posterError: responseData
                }
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
    } catch (error) {
        console.error('❌ Failed to process Excel upload:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 