import { getAllOrders, readOrders } from '../../lib/orderStorage.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

export async function GET() {
    try {
        console.log('🔍 Debug: Checking order storage...');
        
        // Check if data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        let dataDirExists = false;
        try {
            await fs.access(dataDir);
            dataDirExists = true;
        } catch (error) {
            dataDirExists = false;
        }
        
        // Get orders from storage
        const barOrders = await readOrders('bar');
        const kitchenOrders = await readOrders('kitchen');
        const allOrders = await getAllOrders();
        
        // Check file contents directly
        let barFileContent = null;
        let kitchenFileContent = null;
        
        try {
            const barFile = path.join(dataDir, 'barOrders.json');
            barFileContent = await fs.readFile(barFile, 'utf8');
        } catch (error) {
            barFileContent = `Error: ${error.message}`;
        }
        
        try {
            const kitchenFile = path.join(dataDir, 'kitchenOrders.json');
            kitchenFileContent = await fs.readFile(kitchenFile, 'utf8');
        } catch (error) {
            kitchenFileContent = `Error: ${error.message}`;
        }
        
        const debugInfo = {
            timestamp: new Date().toISOString(),
            dataDirectory: {
                path: dataDir,
                exists: dataDirExists
            },
            orderCounts: {
                bar: barOrders.length,
                kitchen: kitchenOrders.length,
                total: allOrders.length
            },
            barOrders: barOrders.slice(0, 3), // Show first 3 orders
            kitchenOrders: kitchenOrders.slice(0, 3),
            rawFiles: {
                barOrders: barFileContent,
                kitchenOrders: kitchenFileContent
            },
            recentOrders: allOrders.slice(0, 5).map(order => ({
                timestamp: order.timestamp,
                department: order.department,
                supplier: order.supplier,
                itemCount: order.items?.length || 0,
                source: order.source
            }))
        };
        
        console.log('🔍 Debug info:', debugInfo);
        
        return new Response(JSON.stringify(debugInfo, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}