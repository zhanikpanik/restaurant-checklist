import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const products = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT
          sp.id,
          sp.name,
          sp.unit,
          sp.poster_ingredient_id,
          sp.section_id,
          sp.category_id,
          sp.is_active,
          pc.name as category_name,
          pc.supplier_id,
          sup.name as supplier_name,
          s.name as section_name
        FROM section_products sp
        LEFT JOIN product_categories pc ON sp.category_id = pc.id
        LEFT JOIN suppliers sup ON pc.supplier_id = sup.id
        LEFT JOIN sections s ON sp.section_id = s.id
        ORDER BY sp.name`
      );
      return result.rows;
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching section products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const body = await request.json();
    const { name, unit, section_id, category_id, is_active, poster_ingredient_id } = body;

    if (!name || !section_id) {
      return NextResponse.json(
        { success: false, error: "Name and section_id are required" },
        { status: 400 }
      );
    }

    // Generate a unique ID for custom products (prefix with 'custom_')
    const ingredientId = poster_ingredient_id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const product = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `INSERT INTO section_products (name, unit, section_id, category_id, is_active, poster_ingredient_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, unit || null, section_id, category_id || null, is_active !== false, ingredientId]
      );
      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;

    const body = await request.json();
    const { id, name, unit, section_id, category_id, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE section_products
         SET name = COALESCE($1, name),
             unit = COALESCE($2, unit),
             section_id = COALESCE($3, section_id),
             category_id = COALESCE($4, category_id),
             is_active = COALESCE($5, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [name, unit, section_id, category_id, is_active, id]
      );
      return result.rows[0];
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
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
      // Check if product is from Poster (non-custom)
      const checkResult = await client.query(
        `SELECT poster_ingredient_id FROM section_products WHERE id = $1`,
        [productId]
      );

      if (checkResult.rows.length > 0) {
        const ingredientId = checkResult.rows[0].poster_ingredient_id;
        // Only allow deletion of custom products (prefixed with 'custom_')
        if (ingredientId && !ingredientId.startsWith('custom_')) {
          return { error: "Невозможно удалить товар из Poster" };
        }
      }

      const deleteResult = await client.query(
        `DELETE FROM section_products WHERE id = $1 RETURNING id`,
        [productId]
      );

      return { deleted: deleteResult.rowCount && deleteResult.rowCount > 0 };
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 403 }
      );
    }

    if (!result.deleted) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
