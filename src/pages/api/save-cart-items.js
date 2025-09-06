export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('💾 Saving cart items to server storage...');
        
        const { department, items } = await request.json();
        
        // Validate required fields
        if (!department || !Array.isArray(items)) {
            throw new Error('Invalid data: department and items array are required');
        }
        
        // Validate department
        if (!['bar', 'kitchen', 'custom'].includes(department)) {
            throw new Error('Invalid department: must be "bar", "kitchen", or "custom"');
        }
        
        // Read existing cart data
        let cartData = {};
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const dataDir = path.join(process.cwd(), 'data');
            const cartFile = path.join(dataDir, 'shoppingCart.json');
            
            // Ensure data directory exists
            await fs.mkdir(dataDir, { recursive: true });
            
            // Read existing cart data
            try {
                const existingData = await fs.readFile(cartFile, 'utf-8');
                cartData = JSON.parse(existingData);
            } catch (readError) {
                // File doesn't exist yet, start with empty cart
                cartData = {};
            }
        } catch (fsError) {
            console.warn('⚠️ File system not available, using memory storage');
            // Fallback to memory storage (will be lost on server restart)
            if (!global.shoppingCart) {
                global.shoppingCart = {};
            }
            cartData = global.shoppingCart;
        }
        
        // Update cart data for this department
        cartData[department] = {
            items: items,
            lastUpdated: new Date().toISOString()
        };
        
        // Save updated cart data
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const dataDir = path.join(process.cwd(), 'data');
            const cartFile = path.join(dataDir, 'shoppingCart.json');
            
            await fs.writeFile(cartFile, JSON.stringify(cartData, null, 2));
            console.log(`✅ Cart items saved for ${department} department`);
        } catch (fsError) {
            // Use memory storage as fallback
            global.shoppingCart = cartData;
            console.log(`✅ Cart items saved to memory for ${department} department`);
        }
        
        return new Response(JSON.stringify({
            success: true,
            message: `Cart items saved for ${department}`,
            itemCount: items.length
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to save cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
