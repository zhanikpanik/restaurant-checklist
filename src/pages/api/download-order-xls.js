import * as XLSX from "xlsx";
import { getAllOrders, readOrders } from "../../lib/orderStorage-postgres.js";

export const prerender = false;

export async function POST({ request, locals }) {
  try {
    console.log("📥 Generating XLS for delivered order...");

    const { orderTimestamp, department } = await request.json();

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

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Format data for supply format
    const supplyData = [
      // Headers
      ["Наименование", "Фасовка (кг,л)", "Количество", "Цена"],
    ];

    // Add order items
    targetOrder.items.forEach((item) => {
      supplyData.push([
        item.name || "", // Name
        item.unit || "шт", // Unit
        item.actualQuantity || item.quantity || 0, // Quantity
        item.price || 0, // Price
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Поставка");

    // Generate Excel file
    const xlsxBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    });

    console.log(
      `✅ Generated XLS for ${department} order with ${targetOrder.items.length} items`,
    );

    return new Response(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="supply-${department}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
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
