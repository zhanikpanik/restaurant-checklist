export const prerender = false;

export async function GET() {
    // This endpoint returns localStorage data for debugging
    const debugInfo = {
        message: "Check browser console and localStorage manually",
        instructions: [
            "Open browser developer tools (F12)",
            "Go to Application/Storage tab", 
            "Check localStorage for these keys:",
            "- barOrderHistory",
            "- kitchenOrderHistory", 
            "- deliveredOrders",
            "Copy the values and share them for debugging"
        ],
        testScript: `
// Run this in browser console to see localStorage data:
console.log('=== ORDER DEBUG INFO ===');
console.log('Bar orders:', JSON.parse(localStorage.getItem('barOrderHistory') || '[]'));
console.log('Kitchen orders:', JSON.parse(localStorage.getItem('kitchenOrderHistory') || '[]'));
console.log('Delivered orders:', JSON.parse(localStorage.getItem('deliveredOrders') || '[]'));
console.log('========================');
        `
    };
    
    return new Response(JSON.stringify(debugInfo, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}