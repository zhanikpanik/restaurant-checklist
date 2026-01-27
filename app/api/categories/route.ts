import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ProductCategory, ApiResponse } from "@/types";

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const categories = await withTenant(restaurantId, async (client) => {
      const result = await client.query<ProductCategory>(
        `SELECT pc.*, s.name as supplier_name
         FROM product_categories pc
         LEFT JOIN suppliers s ON pc.supplier_id = s.id
         ORDER BY pc.name`
      );
      return result.rows;
    });

    return NextResponse.json<ApiResponse<ProductCategory[]>>({
      success: true,
      data: categories,
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
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

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

    const category = await withTenant(restaurantId, async (client) => {
      // Check if category already exists
      const existingCheck = await client.query(
        `SELECT id FROM product_categories WHERE name = $1`,
        [categoryData.name]
      );

      if (existingCheck.rows.length > 0) {
        return null; // Category exists
      }

      // Insert new category
      const result = await client.query<ProductCategory>(
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
      return result.rows[0];
    });

    if (!category) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Category with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<ProductCategory>>({
      success: true,
      data: category,
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
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const body = await request.json();
    const { id, name, supplier_id } = body;

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    const category = await withTenant(restaurantId, async (client) => {
      const result = await client.query<ProductCategory>(
        `UPDATE product_categories
         SET name = COALESCE($1, name),
             supplier_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [name, supplier_id, id]
      );
      return result.rows[0];
    });

    if (!category) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ProductCategory>>({
      success: true,
      data: category,
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

// DELETE /api/categories - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Category ID is required" },
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
      // Check if category has associated products
      const associatedCheck = await client.query(
        `SELECT COUNT(*) as products_count
         FROM section_products
         WHERE category_id = $1`,
        [categoryId]
      );

      const { products_count } = associatedCheck.rows[0];

      if (parseInt(products_count) > 0) {
        return { error: `Cannot delete category with ${products_count} products` };
      }

      const deleteResult = await client.query(
        `DELETE FROM product_categories WHERE id = $1 RETURNING id`,
        [categoryId]
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
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
