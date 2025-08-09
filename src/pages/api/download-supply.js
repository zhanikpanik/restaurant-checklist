import * as XLSX from 'xlsx';

export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('📥 Generating supply download...');
        
        const { orderData } = await request.json();
        
        if (!orderData) {
            throw new Error('No order data provided');
        }
        
        console.log(`📦 Processing supply for ${orderData.department} with ${orderData.items.length} items`);
        
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        
        // Create simple supply data for manual entry
        const supplyData = [
            // Header with basic information
            ['SUPPLY DATA FOR MANUAL ENTRY'],
            [''],
            ['Supply Information:'],
            ['Department:', orderData.department === 'bar' ? 'Бар' : 'Кухня'],
            ['Date:', new Date(orderData.deliveredAt || orderData.timestamp).toLocaleDateString('ru-RU')],
            ['Time:', new Date(orderData.deliveredAt || orderData.timestamp).toLocaleTimeString('ru-RU')],
            ['Total Items:', orderData.items.length],
            [''],
            ['Instructions:'],
            ['1. Go to Poster Dashboard > Storage > Supplies'],
            ['2. Click "Add Supply"'],
            ['3. Select Storage:', orderData.department === 'bar' ? 'Storage ID: 4 (Бар)' : 'Storage ID: 3 (Кухня)'],
            ['4. Select Supplier: ID 1 (Закупка)'],
            ['5. Set Date:', new Date(orderData.deliveredAt || orderData.timestamp).toISOString().split('T')[0]],
            ['6. Add items from the table below:'],
            [''],
            // Column headers in Russian
            ['Наименование', 'Фасовка (кг,л)', 'Количество', 'Цена']
        ];
        
        // Add ingredient rows
        orderData.items.forEach(item => {
            supplyData.push([
                item.name, // Наименование
                item.unit || 'шт', // Фасовка (кг,л)
                item.quantity || item.actualQuantity || 1, // Количество
                '0.01' // Цена (default)
            ]);
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(supplyData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 40 }, // Наименование
            { width: 15 }, // Фасовка (кг,л)
            { width: 12 }, // Количество
            { width: 10 }  // Цена
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Supply Data');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Create filename with timestamp
        const orderDate = new Date(orderData.deliveredAt || orderData.timestamp);
        const timestamp = orderDate.getFullYear() + 
                         String(orderDate.getMonth() + 1).padStart(2, '0') + 
                         String(orderDate.getDate()).padStart(2, '0') + '_' +
                         String(orderDate.getHours()).padStart(2, '0') + 
                         String(orderDate.getMinutes()).padStart(2, '0');
        const filename = `supply_${orderData.department}_${timestamp}.xlsx`;
        
        console.log(`✅ Generated supply file: ${filename}`);
        
        return new Response(excelBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': excelBuffer.length.toString()
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to generate supply download:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}