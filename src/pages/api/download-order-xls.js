import * as XLSX from "xlsx";
import { getAllOrders, readOrders } from "../../lib/orderStorage-postgres.js";

export const prerender = false;

export async function POST({ request, locals }) {
  try {
    console.log("📥 Generating XLS for delivered order...");

    const body = await request.json();
    const { orderTimestamp, department, orderId, type, orders } = body;

    // Handle bulk export
    if (type === 'bulk' && orders && Array.isArray(orders)) {
      console.log(`📦 Bulk exporting ${orders.length} orders`);
      return exportBulkOrders(orders);
    }

    // Handle single order by ID
    if (orderId) {
      console.log(`📦 Looking for order by ID: ${orderId}`);
      const tenantId = locals.tenantId || 'default';
      const allOrders = await getAllOrders(tenantId);
      const targetOrder = allOrders.find(order => 
        order.db_id == orderId || order.timestamp === orderId
      );
      
      if (!targetOrder) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      console.log(`✅ Found order with ${targetOrder.items?.length || 0} items`);
      return exportSingleOrder(targetOrder);
    }

    // Handle legacy format (orderTimestamp + department)
    if (!orderTimestamp || !department) {
      throw new Error("Order timestamp and department are required");
    }

    // Validate department
    if (!["bar", "kitchen"].includes(department)) {
      throw new Error('Invalid department: must be "bar" or "kitchen"');
    }

    console.log(`📦 Looking for order: ${orderTimestamp} in ${department}`);

    let targetOrder = null;

    try {
      // Get orders from PostgreSQL database
      const tenantId = locals.tenantId || 'default';
      const serverOrders = await readOrders(department, tenantId);
      targetOrder = serverOrders.find(
        (order) => order.timestamp === orderTimestamp,
      );
      console.log(
        `🌐 Server storage search: ${targetOrder ? "found" : "not found"}`,
      );
    } catch (error) {
      console.warn("⚠️ Server storage unavailable:", error.message);
    }

    // Note: localStorage is not available on server side, so we only check server storage

    if (!targetOrder) {
      throw new Error(`Order not found: ${orderTimestamp} in ${department}`);
    }

    console.log(`✅ Found order with ${targetOrder.items?.length || 0} items`);
    return exportSingleOrder(targetOrder);
  } catch (error) {
    console.error("❌ Failed to generate order XLS:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Export single order
function exportSingleOrder(order) {
  const workbook = XLSX.utils.book_new();

  // Format data for supply format
  const supplyData = [
    // Headers
    ["Наименование", "Фасовка (кг,л)", "Количество", "Цена"],
  ];

  // Add order items
  order.items.forEach((item) => {
    supplyData.push([
      item.name || "", // Name
      item.unit || "шт", // Unit
      item.actualQuantity || item.quantity || 0, // Quantity
      item.actualPrice || item.price || 0, // Price
    ]);
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(supplyData);

  // Set column widths
  worksheet["!cols"] = [
    { width: 35 }, // Name
    { width: 15 }, // Unit
    { width: 12 }, // Quantity
    { width: 12 }, // Price
  ];

  // Add worksheet to workbook
  const dept = order.departmentName || order.department || 'order';
  XLSX.utils.book_append_sheet(workbook, worksheet, "Поставка");

  // Generate Excel file
  const xlsxBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });

  console.log(
    `✅ Generated XLS for ${dept} order with ${order.items.length} items`,
  );

  return new Response(xlsxBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="supply-${dept}-${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}

// Export bulk orders
function exportBulkOrders(ordersData) {
  const workbook = XLSX.utils.book_new();

  // Create a summary sheet
  const summaryData = [
    ["ID Заказа", "Отдел", "Создан", "Доставлен", "Товаров", "Общее кол-во"],
  ];

  ordersData.forEach(order => {
    summaryData.push([
      order.orderId || "",
      order.department || "",
      order.createdAt || "",
      order.deliveredAt || "",
      order.totalItems || 0,
      order.totalQuantity || 0,
    ]);
  });

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet["!cols"] = [
    { width: 20 },
    { width: 15 },
    { width: 20 },
    { width: 20 },
    { width: 10 },
    { width: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Сводка");

  // Create a sheet for each order
  ordersData.forEach((order, index) => {
    if (!order.items || order.items.length === 0) return;

    const orderData = [
      ["Наименование", "Фасовка", "Количество", "Цена"],
    ];

    order.items.forEach(item => {
      orderData.push([
        item.name || "",
        item.unit || "шт",
        item.actualQuantity || item.quantity || 0,
        item.actualPrice || item.price || 0,
      ]);
    });

    const orderWorksheet = XLSX.utils.aoa_to_sheet(orderData);
    orderWorksheet["!cols"] = [
      { width: 35 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
    ];

    // Sheet name limited to 31 characters
    const sheetName = `${order.department || 'Order'} ${index + 1}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, orderWorksheet, sheetName);
  });

  const xlsxBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });

  console.log(`✅ Generated bulk XLS with ${ordersData.length} orders`);

  return new Response(xlsxBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bulk-orders-${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
