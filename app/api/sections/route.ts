import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get restaurant_id from cookie
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

    // Fetch sections for the current restaurant
    const result = await pool.query(
      `SELECT
        s.id,
        s.name,
        s.emoji,
        s.poster_storage_id,
        COUNT(cp.id) as custom_products_count
      FROM sections s
      LEFT JOIN custom_products cp ON cp.section_id = s.id
      WHERE s.restaurant_id = $1
      GROUP BY s.id, s.name, s.emoji, s.poster_storage_id
      ORDER BY s.name`,
      [restaurantId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
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

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, emoji, poster_storage_id } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurantId, name, emoji || null, poster_storage_id || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Section created successfully",
    });
  } catch (error) {
    console.error("Error creating section:", error);
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

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, name, emoji, poster_storage_id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Section ID is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE sections
       SET name = COALESCE($1, name),
           emoji = COALESCE($2, emoji),
           poster_storage_id = COALESCE($3, poster_storage_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND restaurant_id = $5
       RETURNING *`,
      [name, emoji, poster_storage_id, id, restaurantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Section updated successfully",
    });
  } catch (error) {
    console.error("Error updating section:", error);
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
    const sectionId = searchParams.get("id");

    if (!sectionId) {
      return NextResponse.json(
        { success: false, error: "Section ID is required" },
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
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Check if section is from Poster
    const checkResult = await pool.query(
      `SELECT poster_storage_id FROM sections WHERE id = $1 AND restaurant_id = $2`,
      [sectionId, restaurantId]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].poster_storage_id) {
      return NextResponse.json(
        { success: false, error: "Невозможно удалить секцию из Poster" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `DELETE FROM sections
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [sectionId, restaurantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}