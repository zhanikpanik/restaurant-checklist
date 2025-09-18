import pool from '../../lib/db.js';

export const prerender = false;

export async function POST({ request }) {
    const client = await pool.connect();
    try {
        console.log('🗑️ Clearing cart items from the database...');
        
        const { department } = await request.json();
        let result;

        if (department) {
            // Clear a specific department
            result = await client.query('DELETE FROM cart_items WHERE department = $1', [department]);
            console.log(`✅ Cleared ${result.rowCount} items for department: ${department}`);
        } else {
            // Clear all departments
            result = await client.query('DELETE FROM cart_items');
            console.log(`✅ Cleared all ${result.rowCount} items from the cart.`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: department ? `Cart cleared for ${department}` : 'All cart items cleared',
            clearedCount: result.rowCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Failed to clear cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to clear cart items.',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
