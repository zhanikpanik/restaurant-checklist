import * as XLSX from 'xlsx';
import { addOrder } from '../../lib/orderStorage.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('📊 Processing XLS supply upload...');
        
        const formData = await request.formData();
        const file = formData.get('file');
        const department = formData.get('department') || 'kitchen';
        
        if (!file) {
            throw new Error('No file uploaded');
        }
        
        // Validate department
        if (!['bar', 'kitchen'].includes(department)) {
            throw new Error('Invalid department: must be "bar" or "kitchen"');
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
        
        // Find the header row with required columns
        let headerRowIndex = -1;
        let nameColIndex = -1;
        let packagingColIndex = -1;
        let quantityColIndex = -1;
        let priceColIndex = -1;
        
        // Look for header row with the required columns
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // Check if this row contains our required headers
            const nameCol = row.findIndex(cell => 
                cell && typeof cell === 'string' && 
                (cell.toLowerCase().includes('наименование') || cell.toLowerCase().includes('название'))
            );
            const packagingCol = row.findIndex(cell => 
                cell && typeof cell === 'string' && 
                cell.toLowerCase().includes('фасовка')
            );
            const quantityCol = row.findIndex(cell => 
                cell && typeof cell === 'string' && 
                cell.toLowerCase().includes('количество')
            );
            const priceCol = row.findIndex(cell => 
                cell && typeof cell === 'string' && 
                cell.toLowerCase().includes('цена')
            );
            
            if (nameCol >= 0 && packagingCol >= 0 && quantityCol >= 0 && priceCol >= 0) {
                headerRowIndex = i;
                nameColIndex = nameCol;
                packagingColIndex = packagingCol;
                quantityColIndex = quantityCol;
                priceColIndex = priceCol;
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            throw new Error('Не найдены требуемые колонки: Наименование, Фасовка, Количество, Цена');
        }
        
        console.log(`📋 Found headers at row ${headerRowIndex + 1}`);
        console.log(`📋 Columns: Наименование(${nameColIndex}), Фасовка(${packagingColIndex}), Количество(${quantityColIndex}), Цена(${priceColIndex})`);
        
        // Process data rows
        const supplyItems = [];
        let processedCount = 0;
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const name = row[nameColIndex];
            const packaging = row[packagingColIndex];
            const quantity = row[quantityColIndex];
            const price = row[priceColIndex];
            
            // Skip rows without required data
            if (!name || !quantity) continue;
            
            try {
                const supplyItem = {
                    id: -(Date.now() + Math.random()), // Negative ID for supply items
                    name: String(name).trim(),
                    packaging: packaging ? String(packaging).trim() : '',
                    quantity: parseFloat(quantity) || 0,
                    unit: packaging ? String(packaging).trim() : 'шт',
                    price: parseFloat(price) || 0,
                    supplyDate: new Date().toISOString(),
                    department: department
                };
                
                supplyItems.push(supplyItem);
                processedCount++;
                
                console.log(`✅ Processed item: ${supplyItem.name} - ${supplyItem.quantity} ${supplyItem.unit} - ${supplyItem.price}₽`);
                
            } catch (error) {
                console.warn(`⚠️ Skipped row ${i + 1}: ${error.message}`);
            }
        }
        
        if (supplyItems.length === 0) {
            throw new Error('Не найдено ни одного валидного товара в файле');
        }
        
        // Create supply order record
        const supplyOrder = {
            timestamp: new Date().toISOString(),
            department: department,
            departmentName: department === 'kitchen' ? 'Кухня' : 'Бар',
            items: supplyItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                packaging: item.packaging
            })),
            totalItems: supplyItems.length,
            totalQuantity: supplyItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: supplyItems.reduce((sum, item) => sum + (item.quantity * item.price), 0),
            status: 'delivered', // Supply is already delivered
            supplier: 'Manual XLS Upload',
            source: 'supply_xls',
            supplyDate: new Date().toISOString()
        };
        
        // Save supply order to server storage
        const saveSuccess = await addOrder(department, supplyOrder);
        
        if (!saveSuccess) {
            throw new Error('Failed to save supply order to storage');
        }
        
        console.log(`✅ Supply order saved: ${supplyItems.length} items, total: ${supplyOrder.totalPrice}₽`);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Supply uploaded successfully for ${department}`,
            itemCount: supplyItems.length,
            totalQuantity: supplyOrder.totalQuantity,
            totalPrice: supplyOrder.totalPrice,
            department: department,
            departmentName: supplyOrder.departmentName,
            processingInfo: {
                totalRows: jsonData.length,
                headerRow: headerRowIndex + 1,
                processedItems: processedCount,
                validItems: supplyItems.length
            }
        }, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to process XLS supply upload:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            help: {
                requiredColumns: [
                    'Наименование (обязательно)',
                    'Фасовка (единица измерения)',
                    'Количество (обязательно)',
                    'Цена (стоимость за единицу)'
                ],
                example: {
                    'Наименование': 'Молоко',
                    'Фасовка': 'л',
                    'Количество': 5,
                    'Цена': 80.50
                }
            }
        }, null, 2), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
