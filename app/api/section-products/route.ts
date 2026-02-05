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

    // Optional filtering by section_id and active status
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("section_id");
    const activeOnly = searchParams.get("active") === "true";

    const products = await withTenant(restaurantId, async (client) => {
      let query = `SELECT
          sp.id,
          sp.name,
          sp.unit,
          sp.poster_ingredient_id,
          sp.section_id,
          sp.category_id,
          sp.supplier_id,
          sp.is_active,
          pc.name as category_name,
          COALESCE(sup.name, sup_direct.name) as supplier_name,
          s.name as section_name
        FROM section_products sp
        LEFT JOIN product_categories pc ON sp.category_id = pc.id
        LEFT JOIN suppliers sup ON pc.supplier_id = sup.id
        LEFT JOIN suppliers sup_direct ON sp.supplier_id = sup_direct.id
        LEFT JOIN sections s ON sp.section_id = s.id
        WHERE s.restaurant_id = $1`;
      
      const params: any[] = [restaurantId];
      
      if (sectionId) {
        params.push(Number(sectionId));
        query += ` AND sp.section_id = $${params.length}`;
      }
      
      if (activeOnly) {
        query += ` AND sp.is_active = true`;
      }
      
      query += ` ORDER BY sp.name`;
      
      const result = await client.query(query, params);
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
    const { name, unit, section_id, category_id, supplier_id, is_active, poster_ingredient_id } = body;

    if (!name || !section_id) {
      return NextResponse.json(
        { success: false, error: "Name and section_id are required" },
        { status: 400 }
      );
    }

    // Generate a unique ID for custom products (prefix with 'custom_')
    const ingredientId = poster_ingredient_id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const product = await withTenant(restaurantId, async (client) => {
      // Verify section belongs to this restaurant
      const sectionCheck = await client.query(
        `SELECT id FROM sections WHERE id = $1 AND restaurant_id = $2`,
        [section_id, restaurantId]
      );
      
      if (sectionCheck.rows.length === 0) {
        return null; // Section not found or doesn't belong to this restaurant
      }

      const result = await client.query(
        `INSERT INTO section_products (name, unit, section_id, category_id, supplier_id, is_active, poster_ingredient_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, unit || null, section_id, category_id || null, supplier_id || null, is_active !== false, ingredientId]
      );
      return result.rows[0];
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

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
    const { id, name, unit, section_id, category_id, supplier_id, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE section_products sp
         SET name = COALESCE($1, sp.name),
             unit = COALESCE($2, sp.unit),
             section_id = COALESCE($3, sp.section_id),
             category_id = COALESCE($4, sp.category_id),
             supplier_id = COALESCE($5, sp.supplier_id),
             is_active = COALESCE($6, sp.is_active),
             updated_at = CURRENT_TIMESTAMP
         FROM sections s
         WHERE sp.id = $7 AND sp.section_id = s.id AND s.restaurant_id = $8
         RETURNING sp.*`,
        [name, unit, section_id, category_id, supplier_id, is_active, id, restaurantId]
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
      // Check if product is from Poster (non-custom) and belongs to this restaurant
      const checkResult = await client.query(
        `SELECT sp.poster_ingredient_id 
         FROM section_products sp
         JOIN sections s ON sp.section_id = s.id
         WHERE sp.id = $1 AND s.restaurant_id = $2`,
        [productId, restaurantId]
      );

      if (checkResult.rows.length === 0) {
        return { error: "Product not found" };
      }

      const ingredientId = checkResult.rows[0].poster_ingredient_id;
      // Only allow deletion of custom products (prefixed with 'custom_')
      if (ingredientId && !ingredientId.startsWith('custom_')) {
        return { error: "Невозможно удалить товар из Poster" };
      }

      const deleteResult = await client.query(
        `DELETE FROM section_products sp
         USING sections s
         WHERE sp.id = $1 AND sp.section_id = s.id AND s.restaurant_id = $2
         RETURNING sp.id`,
        [productId, restaurantId]
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
