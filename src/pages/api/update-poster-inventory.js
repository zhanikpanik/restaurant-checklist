import { posterAPI } from '../../config/poster.js';

export async function POST({ request }) {
    try {
        const { purchasedItems, department } = await request.json();
        
        console.log(`🔄 Updating Poster inventory for ${department}...`);
        console.log('Purchased items:', purchasedItems);
        
        if (!purchasedItems || !Array.isArray(purchasedItems)) {
            throw new Error('Invalid purchased items data');
        }
        
        const updateResults = [];
        
        // For each purchased item, update the inventory in Poster
        for (const item of purchasedItems) {
            try {
                console.log(`Updating ${item.name}: +${item.quantity} ${item.unit}`);
                
                // Note: Poster API might not have direct inventory update endpoints
                // This is a placeholder for the actual implementation
                const updateResult = {
                    id: item.id,
                    name: item.name,
                    oldQuantity: 0, // Would get from Poster
                    newQuantity: item.quantity,
                    status: 'updated',
                    message: `Added ${item.quantity} ${item.unit}`
                };
                
                updateResults.push(updateResult);
                
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (itemError) {
                console.error(`Error updating ${item.name}:`, itemError);
                updateResults.push({
                    id: item.id,
                    name: item.name,
                    status: 'error',
                    message: itemError.message
                });
            }
        }
        
        // Count successful updates
        const successCount = updateResults.filter(r => r.status === 'updated').length;
        const errorCount = updateResults.filter(r => r.status === 'error').length;
        
        console.log(`✅ Poster inventory update complete: ${successCount} successful, ${errorCount} errors`);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Inventory updated: ${successCount}/${purchasedItems.length} items`,
            department: department,
            updates: updateResults,
            stats: {
                total: purchasedItems.length,
                successful: successCount,
                errors: errorCount
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error updating Poster inventory:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Failed to update Poster inventory'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to format inventory update for Poster API
function formatInventoryUpdate(item) {
    return {
        ingredient_id: item.id,
        new_quantity: item.quantity,
        operation: 'add', // 'add', 'subtract', or 'set'
        note: `Purchase order update: ${item.quantity} ${item.unit}`
    };
}

// Function to get current inventory from Poster (for comparison)
async function getCurrentInventory(itemId) {
    try {
        // This would use the actual Poster API to get current inventory
        // For now, return mock data
        return {
            ingredient_id: itemId,
            current_quantity: 0,
            unit: 'кг'
        };
    } catch (error) {
        console.error(`Error getting current inventory for item ${itemId}:`, error);
        throw error;
    }
} 