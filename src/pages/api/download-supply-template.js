import * as XLSX from 'xlsx';

export const prerender = false;

export async function GET({ request }) {
    const url = new URL(request.url);
    const department = url.searchParams.get('department') || 'kitchen';
    
    try {
        console.log(`📥 Generating Excel template for ${department} supply...`);
        
        // Get available ingredients for the department
        const token = '305185:07928627ec76d09e589e1381710e55da';
        const baseUrl = 'https://joinposter.com/api';
        const storageId = department === 'kitchen' ? '3' : '4';
        
        // Fetch ingredients for this storage
        const response = await fetch(`${baseUrl}/storage.getStorageLeftovers?token=${token}&storage_id=${storageId}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Poster API error: ${data.error.message}`);
        }
        
        const ingredients = data.response || [];
        console.log(`✅ Found ${ingredients.length} ingredients for ${department} storage`);
        
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        
        // Create supply template data
        const supplyData = [
            // Header row with instructions
            ['SUPPLY TEMPLATE - ' + department.toUpperCase()],
            [''],
            ['INSTRUCTIONS:'],
            ['1. Fill in the "Quantity" column with the amount you want to add'],
            ['2. Leave "Quantity" empty for items you don\'t want to add'],
            ['3. Save the file and upload it back to create the supply'],
            ['4. Date will be automatically set to today'],
            [''],
            // Column headers
            ['Ingredient ID', 'Ingredient Name', 'Current Stock', 'Unit', 'Quantity to Add', 'Notes']
        ];
        
        // Add ingredient rows
        ingredients.forEach(ingredient => {
            supplyData.push([
                ingredient.ingredient_id,
                ingredient.ingredient_name,
                parseFloat(ingredient.ingredient_left) || 0,
                ingredient.ingredient_unit || 'шт',
                '', // Empty quantity column for user to fill
                '' // Notes column
            ]);
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(supplyData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 12 }, // Ingredient ID
            { width: 30 }, // Ingredient Name
            { width: 15 }, // Current Stock
            { width: 10 }, // Unit
            { width: 15 }, // Quantity to Add
            { width: 20 }  // Notes
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Supply Template');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Create filename with timestamp
        const now = new Date();
        const timestamp = now.getFullYear() + 
                         String(now.getMonth() + 1).padStart(2, '0') + 
                         String(now.getDate()).padStart(2, '0') + '_' +
                         String(now.getHours()).padStart(2, '0') + 
                         String(now.getMinutes()).padStart(2, '0');
        const filename = `supply_template_${department}_${timestamp}.xlsx`;
        
        console.log(`✅ Generated Excel template: ${filename}`);
        
        return new Response(excelBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': excelBuffer.length.toString()
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to generate Excel template:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 