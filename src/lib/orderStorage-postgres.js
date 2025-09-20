import pool from './db.js';
import { getTenantFilter } from './tenant.js';

// PostgreSQL-based order storage (replaces JSON file storage)

// Add a new order to PostgreSQL
export async function addOrder(department, orderData, tenantId = 'default') {
    const client = await pool.connect();
    try {
        const tenantFilter = getTenantFilter(tenantId);
        
        // Prepare order data for database storage
        const dbOrderData = {
            ...orderData,
            department: department,
            timestamp: orderData.timestamp || new Date().toISOString()
        };
        
        console.log(`💾 Saving order to PostgreSQL for ${department}:`, dbOrderData);
        
        const result = await client.query(
            `INSERT INTO orders (restaurant_id, order_data, status, created_by_role, created_at) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, created_at`,
            [
                tenantFilter.restaurant_id,
                JSON.stringify(dbOrderData),
                orderData.status || 'pending',
                orderData.created_by_role || department,
                new Date(dbOrderData.timestamp)
            ]
        );
        
        console.log(`✅ Order saved to PostgreSQL with ID: ${result.rows[0].id}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to save order to PostgreSQL:`, error);
        return false;
    } finally {
        client.release();
    }
}

// Read orders from PostgreSQL for specific department
export async function readOrders(department, tenantId = 'default') {
    const client = await pool.connect();
    try {
        const tenantFilter = getTenantFilter(tenantId);
        
        const result = await client.query(
            `SELECT id, order_data, status, created_at, sent_at, delivered_at 
             FROM orders 
             WHERE restaurant_id = $1 AND (order_data->>'department' = $2)
             ORDER BY created_at DESC 
             LIMIT 50`,
            [tenantFilter.restaurant_id, department]
        );
        
        // Parse order_data JSON and add database fields
        const orders = result.rows.map(row => ({
            ...row.order_data,
            db_id: row.id,
            db_status: row.status,
            db_created_at: row.created_at,
            db_sent_at: row.sent_at,
            db_delivered_at: row.delivered_at
        }));
        
        console.log(`📊 Retrieved ${orders.length} orders for ${department} from PostgreSQL`);
        return orders;
        
    } catch (error) {
        console.error(`❌ Failed to read orders from PostgreSQL:`, error);
        return [];
    } finally {
        client.release();
    }
}

// Get all orders from PostgreSQL (both departments)
export async function getAllOrders(tenantId = 'default') {
    const client = await pool.connect();
    try {
        const tenantFilter = getTenantFilter(tenantId);
        
        const result = await client.query(
            `SELECT id, order_data, status, created_at, sent_at, delivered_at 
             FROM orders 
             WHERE restaurant_id = $1 
             ORDER BY created_at DESC 
             LIMIT 100`,
            [tenantFilter.restaurant_id]
        );
        
        // Parse order_data JSON and add database fields
        const orders = result.rows.map(row => ({
            ...row.order_data,
            db_id: row.id,
            db_status: row.status,
            db_created_at: row.created_at,
            db_sent_at: row.sent_at,
            db_delivered_at: row.delivered_at
        }));
        
        console.log(`📊 Retrieved ${orders.length} total orders from PostgreSQL`);
        return orders;
        
    } catch (error) {
        console.error(`❌ Failed to read all orders from PostgreSQL:`, error);
        return [];
    } finally {
        client.release();
    }
}

// Update order status in PostgreSQL
export async function updateOrderStatus(orderId, status, tenantId = 'default') {
    const client = await pool.connect();
    try {
        const tenantFilter = getTenantFilter(tenantId);
        
        let updateFields = ['status = $2'];
        let values = [tenantFilter.restaurant_id, status];
        
        // Add timestamp fields based on status
        if (status === 'sent') {
            updateFields.push('sent_at = $3');
            values.push(new Date());
        } else if (status === 'delivered') {
            updateFields.push('delivered_at = $3');
            values.push(new Date());
        }
        
        const query = `
            UPDATE orders 
            SET ${updateFields.join(', ')} 
            WHERE restaurant_id = $1 AND id = $${values.length + 1}
            RETURNING id, status
        `;
        values.push(orderId);
        
        const result = await client.query(query, values);
        
        if (result.rows.length > 0) {
            console.log(`✅ Updated order ${orderId} status to ${status}`);
            return true;
        } else {
            console.log(`⚠️ Order ${orderId} not found or not updated`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Failed to update order status:`, error);
        return false;
    } finally {
        client.release();
    }
}

// Delete old orders (cleanup function)
export async function deleteOldOrders(daysOld = 30, tenantId = 'default') {
    const client = await pool.connect();
    try {
        const tenantFilter = getTenantFilter(tenantId);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await client.query(
            `DELETE FROM orders 
             WHERE restaurant_id = $1 AND created_at < $2
             RETURNING id`,
            [tenantFilter.restaurant_id, cutoffDate]
        );
        
        console.log(`🗑️ Deleted ${result.rows.length} old orders (older than ${daysOld} days)`);
        return result.rows.length;
        
    } catch (error) {
        console.error(`❌ Failed to delete old orders:`, error);
        return 0;
    } finally {
        client.release();
    }
}

// Migrate localStorage orders to PostgreSQL
export async function migrateLocalStorageOrders(localStorageOrders, department, tenantId = 'default') {
    console.log(`🔄 Migrating ${localStorageOrders.length} orders from localStorage to PostgreSQL...`);
    
    let migratedCount = 0;
    for (const order of localStorageOrders) {
        const success = await addOrder(department, order, tenantId);
        if (success) {
            migratedCount++;
        }
    }
    
    console.log(`✅ Migrated ${migratedCount}/${localStorageOrders.length} orders to PostgreSQL`);
    return migratedCount;
}
