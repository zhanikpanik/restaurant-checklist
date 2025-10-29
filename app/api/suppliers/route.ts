import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
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

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<Supplier>(
      `SELECT s.*,
              COUNT(DISTINCT pc.id) as categories_count,
              COUNT(DISTINCT p.id) as products_count
       FROM suppliers s
       LEFT JOIN product_categories pc ON pc.supplier_id = s.id
       LEFT JOIN products p ON p.supplier_id = s.id
       WHERE s.restaurant_id = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [restaurantId]
    );

    return NextResponse.json<ApiResponse<Supplier[]>>({
      success: true,
      data: result.rows,
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

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if supplier already exists
    const existingCheck = await pool.query(
      `SELECT id FROM suppliers
       WHERE restaurant_id = $1 AND name = $2`,
      [restaurantId, supplierData.name]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Supplier with this name already exists",
        },
        { status: 409 }
      );
    }

    // Insert new supplier
    const result = await pool.query<Supplier>(
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

    return NextResponse.json<ApiResponse<Supplier>>({
      success: true,
      data: result.rows[0],
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

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
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
      .map((field, index) => `${field} = $${index + 3}`)
      .join(", ");

    const query = `
      UPDATE suppliers
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND restaurant_id = $2
      RETURNING *
    `;

    const result = await pool.query<Supplier>(
      query,
      [id, restaurantId, ...values]
    );

    if (result.rowCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Supplier>>({
      success: true,
      data: result.rows[0],
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

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if supplier has associated products or categories
    const associatedCheck = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE supplier_id = $1) as products_count,
        (SELECT COUNT(*) FROM product_categories WHERE supplier_id = $1) as categories_count`,
      [supplierId]
    );

    const { products_count, categories_count } = associatedCheck.rows[0];

    if (parseInt(products_count) > 0 || parseInt(categories_count) > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Cannot delete supplier with ${products_count} products and ${categories_count} categories`,
        },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `DELETE FROM suppliers
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [supplierId, restaurantId]
    );

    if (result.rowCount === 0) {
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