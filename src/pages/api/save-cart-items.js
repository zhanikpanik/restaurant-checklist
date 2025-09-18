import pool from '../../lib/db.js';

export const prerender = false;

export async function POST({ request }) {
    const client = await pool.connect();
    try {
        console.log('💾 Saving cart items to the database...');
        
        const { department, items } = await request.json();

        // Validate required fields
        if (!department || !Array.isArray(items)) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid data: department and items array are required' }), { status: 400 });
        }

        await client.query('BEGIN'); // Start transaction

        // Clear existing items for the department to ensure a fresh state
        await client.query('DELETE FROM cart_items WHERE department = $1', [department]);

        // Insert new items
        if (items.length > 0) {
            const insertQuery = 'INSERT INTO cart_items(product_id, name, quantity, unit, department) VALUES($1, $2, $3, $4, $5)';
            for (const item of items) {
                // Ensure all required fields for an item are present
                if (item.id === undefined || item.name === undefined || item.quantity === undefined) {
                    throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
                }
                const values = [String(item.id), item.name, item.quantity, item.unit || null, department];
                await client.query(insertQuery, values);
            }
        }

        await client.query('COMMIT'); // Commit transaction
        
        console.log(`✅ Cart items saved for ${department} department. Total: ${items.length} items.`);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Cart items for ${department} saved successfully.`,
            itemCount: items.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error('❌ Failed to save cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to save cart items.',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
