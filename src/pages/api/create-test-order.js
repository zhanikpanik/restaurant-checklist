export const prerender = false;

export async function POST() {
    // This creates a test delivered order for testing procurement page
    const testOrder = {
        timestamp: new Date().toISOString(),
        department: 'bar',
        departmentName: 'Бар',
        items: [
            {
                id: '367',
                name: 'Appassionate',
                quantity: 2,
                unit: 'l',
                actualQuantity: 2
            },
            {
                id: '368', 
                name: 'Aroma de French',
                quantity: 1,
                unit: 'l',
                actualQuantity: 1
            }
        ],
        totalItems: 2,
        totalQuantity: 3,
        actualTotalQuantity: 3,
        status: 'delivered', // Already marked as delivered
        deliveredAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
        success: true,
        message: 'Test order created. Add this to localStorage in browser console:',
        script: `
// Run this in browser console to add test order:
const testOrder = ${JSON.stringify(testOrder, null, 2)};
const barOrders = JSON.parse(localStorage.getItem('barOrderHistory') || '[]');
barOrders.unshift(testOrder);
localStorage.setItem('barOrderHistory', JSON.stringify(barOrders));
console.log('✅ Test order added! Refresh /restaurant/procurement to see it.');
        `
    }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}