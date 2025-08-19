import fs from 'node:fs/promises';
import path from 'node:path';

// Storage file paths
const STORAGE_DIR = path.join(process.cwd(), 'data');
const BAR_ORDERS_FILE = path.join(STORAGE_DIR, 'barOrders.json');
const KITCHEN_ORDERS_FILE = path.join(STORAGE_DIR, 'kitchenOrders.json');

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create storage directory:', error);
    }
}

// Get storage file path for department
function getStorageFile(department) {
    return department === 'bar' ? BAR_ORDERS_FILE : KITCHEN_ORDERS_FILE;
}

// Read orders from file
export async function readOrders(department) {
    try {
        await ensureStorageDir();
        const filePath = getStorageFile(department);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is empty, return empty array
            return [];
        }
    } catch (error) {
        console.error(`Failed to read ${department} orders:`, error);
        return [];
    }
}

// Write orders to file
export async function writeOrders(department, orders) {
    try {
        await ensureStorageDir();
        const filePath = getStorageFile(department);
        
        // Keep only last 50 orders to prevent file from growing too large
        const limitedOrders = orders.slice(0, 50);
        
        await fs.writeFile(filePath, JSON.stringify(limitedOrders, null, 2), 'utf8');
        console.log(`✅ Saved ${limitedOrders.length} orders to ${department} storage`);
        return true;
    } catch (error) {
        console.error(`Failed to write ${department} orders:`, error);
        return false;
    }
}

// Add a new order
export async function addOrder(department, orderData) {
    try {
        let existingOrders = await readOrders(department);

        // Replace any existing order with the same timestamp (idempotent update)
        existingOrders = existingOrders.filter(o => !(o.timestamp === orderData.timestamp && o.department === department));

        // Add new/updated order to beginning
        existingOrders.unshift(orderData);

        // Save updated orders
        const success = await writeOrders(department, existingOrders);
        
        if (success) {
            console.log(`✅ Added new order to ${department}: ${orderData.items?.length || 0} items`);
            return true;
        } else {
            throw new Error('Failed to save order');
        }
    } catch (error) {
        console.error(`Failed to add order to ${department}:`, error);
        return false;
    }
}

// Get all orders (combined from both departments)
export async function getAllOrders() {
    try {
        const [barOrders, kitchenOrders] = await Promise.all([
            readOrders('bar'),
            readOrders('kitchen')
        ]);
        
        // Combine and sort by timestamp
        const allOrders = [...barOrders, ...kitchenOrders]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return allOrders;
    } catch (error) {
        console.error('Failed to get all orders:', error);
        return [];
    }
}
