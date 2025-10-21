import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { ProductCategory, ApiResponse } from "@/types";

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<ProductCategory>(
      `SELECT pc.*, s.name as supplier_name
       FROM product_categories pc
       LEFT JOIN suppliers s ON pc.supplier_id = s.id
       WHERE pc.restaurant_id = $1
       ORDER BY pc.name`,
      [restaurantId]
    );

    return NextResponse.json<ApiResponse<ProductCategory[]>>({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    const categoryData = await request.json();

    // Validate required fields
    if (!categoryData.name) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Category name is required",
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

    // Check if category already exists
    const existingCheck = await pool.query(
      `SELECT id FROM product_categories
       WHERE restaurant_id = $1 AND name = $2`,
      [restaurantId, categoryData.name]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Category with this name already exists",
        },
        { status: 409 }
      );
    }

    // Insert new category
    const result = await pool.query<ProductCategory>(
      `INSERT INTO product_categories
       (restaurant_id, name, supplier_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        restaurantId,
        categoryData.name,
        categoryData.supplier_id || null,
      ]
    );

    return NextResponse.json<ApiResponse<ProductCategory>>({
      success: true,
      data: result.rows[0],
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/categories - Update category
export async function PATCH(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    const restaurantId = restaurantCookie?.value || "default";

    const body = await request.json();
    const { id, name, supplier_id } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    if (!pool) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<ProductCategory>(
      `UPDATE product_categories
       SET name = COALESCE($1, name),
           supplier_id = $2
       WHERE id = $3 AND restaurant_id = $4
       RETURNING *`,
      [name, supplier_id, id, restaurantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ProductCategory>>({
      success: true,
      data: result.rows[0],
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}