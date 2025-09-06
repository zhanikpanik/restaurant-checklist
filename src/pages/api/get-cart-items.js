export const prerender = false;

export async function GET({ url }) {
    try {
        console.log('📦 Loading cart items from server storage...');
        
        const department = url.searchParams.get('department');
        
        // Read cart data
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
                // File doesn't exist yet, return empty cart
                cartData = {};
            }
        } catch (fsError) {
            console.warn('⚠️ File system not available, using memory storage');
            // Fallback to memory storage
            cartData = global.shoppingCart || {};
        }
        
        // Return specific department or all departments
        let responseData;
        if (department) {
            responseData = cartData[department] || { items: [], lastUpdated: null };
        } else {
            responseData = cartData;
        }
        
        console.log(`✅ Cart items loaded${department ? ` for ${department}` : ' for all departments'}`);
        
        return new Response(JSON.stringify({
            success: true,
            data: responseData,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to load cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
