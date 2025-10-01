import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

export async function POST({ request }) {
    const { client, error: dbError } = await getDbClient();
    if (dbError) return dbError;
    
    try {
        const { cartItems } = await request.json();
        
        if (!cartItems || cartItems.length === 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'No cart items provided' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get product categories and their assigned suppliers
        const productIds = cartItems.map(item => item.id);
        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                pc.name as category_name,
                s.id as supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN suppliers s ON pc.default_supplier_id = s.id
            WHERE p.id = ANY($1);
        `;
        
        const result = await client.query(query, [productIds]);
        const productSupplierMap = new Map();
        
        result.rows.forEach(row => {
            productSupplierMap.set(row.product_id, {
                supplierId: row.supplier_id,
                supplierName: row.supplier_name,
                supplierPhone: row.supplier_phone,
                categoryName: row.category_name
            });
        });

        // Group cart items by supplier
        const supplierOrders = new Map();
        const unassignedItems = [];

        cartItems.forEach(item => {
            const supplierInfo = productSupplierMap.get(parseInt(item.id));
            
            if (supplierInfo && supplierInfo.supplierId) {
                const supplierId = supplierInfo.supplierId;
                
                if (!supplierOrders.has(supplierId)) {
                    supplierOrders.set(supplierId, {
                        supplier: {
                            id: supplierId,
                            name: supplierInfo.supplierName,
                            phone: supplierInfo.supplierPhone
                        },
                        items: []
                    });
                }
                
                supplierOrders.get(supplierId).items.push({
                    ...item,
                    categoryName: supplierInfo.categoryName
                });
            } else {
                // Items without assigned supplier
                unassignedItems.push(item);
            }
        });

        // Convert Map to Array for easier handling in frontend
        const ordersBySupplier = Array.from(supplierOrders.values());

        return new Response(JSON.stringify({ 
            success: true, 
            data: {
                ordersBySupplier: ordersBySupplier,
                unassignedItems: unassignedItems,
                totalSuppliers: ordersBySupplier.length,
                totalAssignedItems: ordersBySupplier.reduce((sum, order) => sum + order.items.length, 0),
                totalUnassignedItems: unassignedItems.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Failed to group orders by supplier:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to process orders by supplier',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
