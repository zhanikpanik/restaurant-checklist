import * as XLSX from 'xlsx';

export const prerender = false;

export async function GET({ request }) {
    const url = new URL(request.url);
    const department = url.searchParams.get('department') || 'kitchen';
    
    try {
        console.log(`📥 Generating Excel template for ${department} supply...`);
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Create template data with the required fields: Наименование, Фасовка, Количество, Цена
        const templateData = [
            // Headers in Russian
            ['Наименование', 'Фасовка', 'Количество', 'Цена'],
            // Example rows
            ['Молоко', 'л', 5, 80.50],
            ['Хлеб белый', 'шт', 10, 45.00],
            ['Мясо говядина', 'кг', 3, 850.00],
            ['Картофель', 'кг', 15, 35.00],
            ['Масло подсолнечное', 'л', 2, 120.00],
            // Empty rows for user input
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', '']
        ];
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 30 }, // Наименование
            { width: 12 }, // Фасовка 
            { width: 12 }, // Количество
            { width: 12 }  // Цена
        ];
        
        // Style the header row
        const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            
            worksheet[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "E3F2FD" } },
                alignment: { horizontal: "center" }
            };
        }
        
        // Add instructions as comments or additional sheet
        const instructionsData = [
            ['Инструкция по заполнению:'],
            [''],
            ['Наименование - Название товара (обязательно)'],
            ['Фасовка - Единица измерения (кг, л, шт, упак и т.д.)'],
            ['Количество - Количество товара (обязательно)'],
            ['Цена - Цена за единицу товара'],
            [''],
            ['Пример заполнения:'],
            ['Молоко | л | 5 | 80.50'],
            ['Означает: 5 литров молока по 80.50₽ за литр'],
            [''],
            ['После заполнения сохраните файл и загрузите в системе'],
            ['через кнопку "Загрузить поставку (XLS)"']
        ];
        
        const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
        instructionsSheet['!cols'] = [{ width: 50 }];
        
        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Поставка');
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Инструкция');
        
        // Generate Excel file
        const xlsxBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true 
        });
        
        console.log(`✅ Generated supply template for ${department}`);
        
        return new Response(xlsxBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="supply-template-${department}.xlsx"`
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to generate template:', error);
        
        // Return error response
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}