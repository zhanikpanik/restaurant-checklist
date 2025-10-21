import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `SELECT
        sp.id,
        sp.name,
        sp.unit,
        sp.poster_ingredient_id,
        sp.section_id,
        sp.category_id,
        sp.is_active,
        pc.name as category_name,
        s.name as section_name
      FROM section_products sp
      LEFT JOIN product_categories pc ON sp.category_id = pc.id
      LEFT JOIN sections s ON sp.section_id = s.id
      ORDER BY sp.name`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
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
    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, unit, section_id, category_id, is_active } = body;

    if (!name || !section_id) {
      return NextResponse.json(
        { success: false, error: "Name and section_id are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO section_products (name, unit, section_id, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, unit || null, section_id, category_id || null, is_active !== false]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
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
    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, name, unit, section_id, category_id, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
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

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
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

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if product is from Poster
    const checkResult = await pool.query(
      `SELECT poster_ingredient_id FROM section_products WHERE id = $1`,
      [productId]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].poster_ingredient_id) {
      return NextResponse.json(
        { success: false, error: "Невозможно удалить товар из Poster" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `DELETE FROM section_products WHERE id = $1 RETURNING id`,
      [productId]
    );

    if (result.rowCount === 0) {
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
