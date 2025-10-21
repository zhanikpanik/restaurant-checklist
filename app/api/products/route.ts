import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { Product, ApiResponse } from "@/types";

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const categoryId = searchParams.get("category_id");

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    let query = `
      SELECT p.*,
             c.name as category_name,
             s.name as supplier_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.restaurant_id = $1
    `;
    const params: any[] = [restaurantId];

    if (department) {
      query += ` AND p.department = $${params.length + 1}`;
      params.push(department);
    }

    if (categoryId) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    query += ` ORDER BY p.name`;

    const result = await pool.query<Product>(query, params);

    return NextResponse.json<ApiResponse<Product[]>>({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    const productData = await request.json();

    // Validate required fields
    if (!productData.name) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Product name is required",
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

    // Check if product already exists
    const existingCheck = await pool.query(
      `SELECT id FROM products
       WHERE restaurant_id = $1 AND name = $2 AND department = $3`,
      [restaurantId, productData.name, productData.department || null]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Product with this name already exists in this department",
        },
        { status: 409 }
      );
    }

    // Insert new product
    const result = await pool.query<Product>(
      `INSERT INTO products
       (restaurant_id, name, category_id, supplier_id, poster_id, unit, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        restaurantId,
        productData.name,
        productData.category_id || null,
        productData.supplier_id || null,
        productData.poster_id || null,
        productData.unit || null,
        productData.department || null,
      ]
    );

    return NextResponse.json<ApiResponse<Product>>({
      success: true,
      data: result.rows[0],
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/products - Update product
export async function PATCH(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Product ID is required",
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
      UPDATE products
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND restaurant_id = $2
      RETURNING *
    `;

    const result = await pool.query<Product>(
      query,
      [id, restaurantId, ...values]
    );

    if (result.rowCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Product>>({
      success: true,
      data: result.rows[0],
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [productId, restaurantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}