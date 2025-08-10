import * as XLSX from 'xlsx';
import { getAllOrders, readOrders } from '../../lib/orderStorage.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('📥 Generating XLS for delivered order...');
        
        const { orderTimestamp, department } = await request.json();
        
        if (!orderTimestamp || !department) {
            throw new Error('Order timestamp and department are required');
        }
        
        // Validate department
        if (!['bar', 'kitchen'].includes(department)) {
            throw new Error('Invalid department: must be "bar" or "kitchen"');
        }
        
        console.log(`📦 Looking for order: ${orderTimestamp} in ${department}`);
        
        // Get orders from both localStorage data and server storage
        let targetOrder = null;
        
        // First try to get from server storage
        try {
            const serverOrders = await readOrders(department);
            targetOrder = serverOrders.find(order => order.timestamp === orderTimestamp);
            console.log(`🌐 Server storage search: ${targetOrder ? 'found' : 'not found'}`);
        } catch (error) {
            console.warn('⚠️ Server storage unavailable:', error.message);
        }
        
        if (!targetOrder) {
            throw new Error(`Order not found: ${orderTimestamp} in ${department}`);
        }
        
        if (targetOrder.status !== 'delivered') {
            throw new Error('Order must be delivered to generate XLS');
        }
        
        console.log(`✅ Found order with ${targetOrder.items?.length || 0} items`);
        
        // Create workbook for Poster import
        const workbook = XLSX.utils.book_new();
        
        // Format data for Poster Supply (Поставка) format
        // Required Poster fields: Наименование, Фасовка (кг,л), Количество, Цена
        const supplyData = [
            // Headers in Russian for Poster
            ['Наименование', 'Фасовка (кг,л)', 'Количество', 'Цена'],
        ];
        
        // Add order items
        targetOrder.items.forEach(item => {
            supplyData.push([
                item.name || '',                    // Наименование
                item.unit || 'шт',                 // Фасовка (кг,л)
                item.actualQuantity || item.quantity || 0,  // Количество (use actual if available)
                item.price || 0                    // Цена
            ]);
        });
        
        // Add summary row
        const totalQuantity = targetOrder.items.reduce((sum, item) => 
            sum + (item.actualQuantity || item.quantity || 0), 0
        );
        const totalPrice = targetOrder.items.reduce((sum, item) => 
            sum + ((item.actualQuantity || item.quantity || 0) * (item.price || 0)), 0
        );
        
        supplyData.push([]);  // Empty row
        supplyData.push(['ИТОГО:', '', totalQuantity, totalPrice]);
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(supplyData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 35 }, // Наименование
            { width: 15 }, // Фасовка (кг,л)
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
        
        // Add order information sheet
        const orderDate = new Date(targetOrder.timestamp);
        const deliveredDate = targetOrder.deliveredAt ? new Date(targetOrder.deliveredAt) : orderDate;
        
        const orderInfoData = [
            ['ИНФОРМАЦИЯ О ЗАКАЗЕ'],
            [''],
            ['Отдел:', targetOrder.departmentName || (department === 'kitchen' ? 'Кухня' : 'Бар')],
            ['Дата заказа:', orderDate.toLocaleDateString('ru-RU')],
            ['Время заказа:', orderDate.toLocaleTimeString('ru-RU')],
            ['Дата доставки:', deliveredDate.toLocaleDateString('ru-RU')],
            ['Время доставки:', deliveredDate.toLocaleTimeString('ru-RU')],
            ['Поставщик:', targetOrder.supplier || 'Не указан'],
            ['Статус:', 'Доставлено'],
            [''],
            ['ИТОГОВЫЕ ДАННЫЕ'],
            ['Всего позиций:', targetOrder.items.length],
            ['Общее количество:', totalQuantity],
            ['Общая стоимость:', totalPrice + ' ₽'],
            [''],
            ['ИНСТРУКЦИЯ ДЛЯ POSTER:'],
            ['1. Откройте Poster Dashboard'],
            ['2. Перейдите в Склад → Поставки'],
            ['3. Нажмите "Добавить поставку"'],
            ['4. Выберите поставщика'],
            ['5. Укажите дату поставки'],
            ['6. Добавьте товары из листа "Поставка"'],
            ['7. Сохраните поставку']
        ];
        
        const orderInfoSheet = XLSX.utils.aoa_to_sheet(orderInfoData);
        orderInfoSheet['!cols'] = [{ width: 25 }, { width: 30 }];
        
        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Поставка');
        XLSX.utils.book_append_sheet(workbook, orderInfoSheet, 'Информация');
        
        // Generate Excel file
        const xlsxBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true 
        });
        
        console.log(`✅ Generated XLS for ${department} order with ${targetOrder.items.length} items`);
        
        return new Response(xlsxBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="supply-${department}-${orderDate.toISOString().split('T')[0]}.xlsx"`
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to generate order XLS:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
