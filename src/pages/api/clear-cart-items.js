export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('🗑️ Clearing cart items from server storage...');
        
        const { department } = await request.json();
        
        // Read existing cart data
        let cartData = {};
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const dataDir = path.join(process.cwd(), 'data');
            const cartFile = path.join(dataDir, 'shoppingCart.json');
            
            try {
                const existingData = await fs.readFile(cartFile, 'utf-8');
                cartData = JSON.parse(existingData);
            } catch (readError) {
                // File doesn't exist yet, nothing to clear
                cartData = {};
            }
        } catch (fsError) {
            console.warn('⚠️ File system not available, using memory storage');
            cartData = global.shoppingCart || {};
        }
        
        if (department) {
            // Clear specific department
            if (cartData[department]) {
                delete cartData[department];
                console.log(`✅ Cleared cart items for ${department} department`);
            }
        } else {
            // Clear all departments
            cartData = {};
            console.log('✅ Cleared all cart items');
        }
        
        // Save updated cart data
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const dataDir = path.join(process.cwd(), 'data');
            const cartFile = path.join(dataDir, 'shoppingCart.json');
            
            await fs.writeFile(cartFile, JSON.stringify(cartData, null, 2));
        } catch (fsError) {
            // Use memory storage as fallback
            global.shoppingCart = cartData;
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: department ? `Cart cleared for ${department}` : 'All cart items cleared'
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to clear cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
