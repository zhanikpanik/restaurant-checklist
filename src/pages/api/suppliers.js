import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantFilter } from "../../lib/tenant.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

// GET: Fetch all suppliers
async function getSuppliers(tenantId) {
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    console.log("🔍 Loading suppliers for tenant:", tenantId);

    // Check if restaurant_id column exists
    const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
        `);

    const hasRestaurantId = columnCheck.rows.length > 0;
    console.log(
      "🏢 Suppliers table has restaurant_id column:",
      hasRestaurantId,
    );

    let result;
    if (hasRestaurantId) {
      // Use tenant filtering if column exists
      const tenantFilter = getTenantFilter(tenantId);
      console.log("🔍 Using tenant filter:", tenantFilter);

      result = await client.query(
        "SELECT id, name, contact_info, phone, poster_supplier_id, created_at FROM suppliers WHERE restaurant_id = $1 ORDER BY name ASC",
        [tenantFilter.restaurant_id],
      );

      console.log(
        "📊 Found",
        result.rows.length,
        "suppliers for tenant",
        tenantId,
        "restaurant_id:",
        tenantFilter.restaurant_id,
      );
    } else {
      // No restaurant_id column, get all suppliers
      console.log("📋 Getting all suppliers (no tenant filtering available)");
      result = await client.query(
        "SELECT id, name, contact_info, phone, poster_supplier_id, created_at FROM suppliers ORDER BY name ASC",
      );
    }

    console.log("📊 Total suppliers loaded:", result.rows.length);

    return {
      status: 200,
      body: {
        success: true,
        data: result.rows,
        hasRestaurantId: hasRestaurantId,
        message: hasRestaurantId
          ? "Loaded with tenant filtering"
          : "Loaded all suppliers (no tenant column)",
      },
    };
  } finally {
    safeRelease(client);
  }
}

// POST: Create a new supplier
async function createSupplier(request, tenantId) {
  const { name, contact_info, phone, poster_supplier_id } =
    await request.json();

  if (!name || name.trim() === "") {
    return {
      status: 400,
      body: { success: false, error: "Supplier name is required" },
    };
  }

  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    // Check if restaurant_id column exists
    const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
        `);

    const hasRestaurantId = columnCheck.rows.length > 0;
    console.log(
      "🏢 Creating supplier, restaurant_id column exists:",
      hasRestaurantId,
    );
    console.log(
      "📝 Creating supplier with tenantId:",
      tenantId,
      "name:",
      name.trim(),
    );

    let result;
    if (hasRestaurantId) {
      // Include restaurant_id if column exists
      result = await client.query(
        "INSERT INTO suppliers (restaurant_id, name, contact_info, phone, poster_supplier_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [
          tenantId,
          name.trim(),
          contact_info || null,
          phone || null,
          poster_supplier_id || null,
        ],
      );
      console.log("✅ Supplier created:", result.rows[0]);
    } else {
      // Create without restaurant_id if column doesn't exist
      result = await client.query(
        "INSERT INTO suppliers (name, contact_info, phone, poster_supplier_id) VALUES ($1, $2, $3, $4) RETURNING *",
        [
          name.trim(),
          contact_info || null,
          phone || null,
          poster_supplier_id || null,
        ],
      );
    }

    return {
      status: 201,
      body: { success: true, data: result.rows[0] },
    };
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return {
        status: 409,
        body: { success: false, error: "Supplier name already exists" },
      };
    }
    throw error;
  } finally {
    safeRelease(client);
  }
}

// PUT: Update an existing supplier
async function updateSupplier(request, tenantId) {
  const { id, name, contact_info, phone, poster_supplier_id } =
    await request.json();

  if (!id) {
    return {
      status: 400,
      body: { success: false, error: "Supplier ID is required" },
    };
  }

  if (!name || name.trim() === "") {
    return {
      status: 400,
      body: { success: false, error: "Supplier name is required" },
    };
  }

  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    console.log(`🔄 [${tenantId}] Updating supplier ID:`, id);

    // Check if restaurant_id column exists
    const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
        `);

    const hasRestaurantId = columnCheck.rows.length > 0;

    let result;
    if (hasRestaurantId) {
      // Update only if belongs to tenant
      result = await client.query(
        "UPDATE suppliers SET name = $1, contact_info = $2, phone = $3, poster_supplier_id = $4 WHERE id = $5 AND restaurant_id = $6 RETURNING *",
        [
          name.trim(),
          contact_info || null,
          phone || null,
          poster_supplier_id || null,
          id,
          tenantId,
        ],
      );
    } else {
      // No tenant filtering if column doesn't exist
      result = await client.query(
        "UPDATE suppliers SET name = $1, contact_info = $2, phone = $3, poster_supplier_id = $4 WHERE id = $5 RETURNING *",
        [
          name.trim(),
          contact_info || null,
          phone || null,
          poster_supplier_id || null,
          id,
        ],
      );
    }

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: { success: false, error: "Supplier not found" },
      };
    }

    console.log(`✅ [${tenantId}] Supplier updated successfully`);
    return {
      status: 200,
      body: { success: true, data: result.rows[0] },
    };
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return {
        status: 409,
        body: { success: false, error: "Supplier name already exists" },
      };
    }
    throw error;
  } finally {
    safeRelease(client);
  }
}

// Main handler for GET and POST requests
export async function GET({ locals, request }) {
  try {
    const tenantId = getTenantId(request);
    console.log(
      "🔍 GET /api/suppliers - tenantId:",
      tenantId,
      "locals:",
      locals,
    );
    const { status, body } = await getSuppliers(tenantId);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);

    // Return empty array if database connection fails - no hardcoded suppliers
    console.log(
      "⚠️ Database connection failed, returning empty suppliers array",
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: [], // Empty array instead of hardcoded suppliers
        usingMockData: true,
        message: "Database connection failed - no suppliers available",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function POST({ request, locals }) {
  let requestData;
  try {
    requestData = await request.json();
    const tenantId = getTenantId(request);

    // Create a new request object with the parsed data
    const newRequest = {
      json: async () => requestData,
    };

    const { status, body } = await createSupplier(newRequest, tenantId);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create supplier:", error);

    // Return mock success response if database connection fails
    if (requestData) {
      const mockSupplier = {
        id: Date.now(), // Use timestamp as mock ID
        name: requestData.name,
        phone: requestData.phone,
        contact_info: requestData.contact_info,
        created_at: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: mockSupplier,
          usingMockData: true,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500 },
    );
  }
}

export async function PUT({ request, locals }) {
  let requestData;
  try {
    requestData = await request.json();
    const tenantId = getTenantId(request);

    // Create a new request object with the parsed data
    const newRequest = {
      json: async () => requestData,
    };

    const { status, body } = await updateSupplier(newRequest, tenantId);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to update supplier:", error);

    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500 },
    );
  }
}

// DELETE: Delete a supplier
export async function DELETE({ request, locals }) {
  try {
    const { id } = await request.json();
    const tenantId = getTenantId(request);

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Supplier ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { client, error } = await getDbClient();
    if (error) return error;

    try {
      await client.query("BEGIN");

      // Check if restaurant_id column exists
      const columnCheck = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
            `);

      const hasRestaurantId = columnCheck.rows.length > 0;

      // Check if supplier is being used by categories
      let usageCheck;
      if (hasRestaurantId) {
        usageCheck = await client.query(
          "SELECT COUNT(*) as count FROM product_categories WHERE supplier_id = $1 AND restaurant_id = $2",
          [id, tenantId],
        );
      } else {
        usageCheck = await client.query(
          "SELECT COUNT(*) as count FROM product_categories WHERE supplier_id = $1",
          [id],
        );
      }

      const categoryCount = parseInt(usageCheck.rows[0].count);
      if (categoryCount > 0) {
        await client.query("ROLLBACK");
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cannot delete supplier: ${categoryCount} categories are using this supplier`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Delete the supplier
      let result;
      if (hasRestaurantId) {
        result = await client.query(
          "DELETE FROM suppliers WHERE id = $1 AND restaurant_id = $2 RETURNING name",
          [id, tenantId],
        );
      } else {
        result = await client.query(
          "DELETE FROM suppliers WHERE id = $1 RETURNING name",
          [id],
        );
      }

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Supplier not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      await client.query("COMMIT");

      return new Response(
        JSON.stringify({
          success: true,
          message: `Supplier "${result.rows[0].name}" deleted successfully`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to delete supplier:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    } finally {
      safeRelease(client);
    }
  } catch (error) {
    console.error("Failed to parse request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      { status: 400 },
    );
  }
}
