import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Supplier, ApiResponse } from "@/types";

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const suppliers = await withTenant(restaurantId, async (client) => {
      const result = await client.query<Supplier>(
        `SELECT s.*,
                COUNT(DISTINCT pc.id) as categories_count
         FROM suppliers s
         LEFT JOIN product_categories pc ON pc.supplier_id = s.id
         GROUP BY s.id
         ORDER BY s.name`
      );
      return result.rows;
    });

    return NextResponse.json<ApiResponse<Supplier[]>>({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const supplierData = await request.json();

    // Validate required fields
    if (!supplierData.name) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Supplier name is required",
        },
        { status: 400 }
      );
    }

    const supplier = await withTenant(restaurantId, async (client) => {
      // Check if supplier already exists
      const existingCheck = await client.query(
        `SELECT id FROM suppliers WHERE name = $1`,
        [supplierData.name]
      );

      if (existingCheck.rows.length > 0) {
        return null; // Supplier exists
      }

      // Insert new supplier
      const result = await client.query<Supplier>(
        `INSERT INTO suppliers
         (restaurant_id, name, phone, contact_info, poster_supplier_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          restaurantId,
          supplierData.name,
          supplierData.phone || null,
          supplierData.contact_info || null,
          supplierData.poster_supplier_id || null,
        ]
      );
      return result.rows[0];
    });

    if (!supplier) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Supplier with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<Supplier>>({
      success: true,
      data: supplier,
      message: "Supplier created successfully",
    });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/suppliers - Update supplier
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Supplier ID is required",
        },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    if (fields.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "No fields to update",
        },
        { status: 400 }
      );
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const supplier = await withTenant(restaurantId, async (client) => {
      const query = `
        UPDATE suppliers
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query<Supplier>(query, [id, ...values]);
      return result.rows[0];
    });

    if (!supplier) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Supplier>>({
      success: true,
      data: supplier,
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers - Delete supplier
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("id");

    if (!supplierId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Supplier ID is required" },
        { status: 400 }
      );
    }

    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const result = await withTenant(restaurantId, async (client) => {
      // Check if supplier has associated categories
      const associatedCheck = await client.query(
        `SELECT COUNT(*) as categories_count FROM product_categories WHERE supplier_id = $1`,
        [supplierId]
      );

      const { categories_count } = associatedCheck.rows[0];

      if (parseInt(categories_count) > 0) {
        return { error: `Cannot delete supplier with ${categories_count} categories` };
      }

      const deleteResult = await client.query(
        `DELETE FROM suppliers WHERE id = $1 RETURNING id`,
        [supplierId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ("error" in result) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    if (!result.deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
