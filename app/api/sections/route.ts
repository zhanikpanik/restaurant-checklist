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

    const sections = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `SELECT
          s.id,
          s.name,
          s.emoji,
          s.poster_storage_id,
          COUNT(sp.id) as custom_products_count
        FROM sections s
        LEFT JOIN section_products sp ON sp.section_id = s.id AND sp.is_active = true
        WHERE s.restaurant_id = $1
        GROUP BY s.id, s.name, s.emoji, s.poster_storage_id
        ORDER BY s.name`,
        [restaurantId]
      );
      return result.rows;
    });

    return NextResponse.json({
      success: true,
      data: sections,
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

    const body = await request.json();
    const { name, emoji, poster_storage_id } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const section = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `INSERT INTO sections (restaurant_id, name, emoji, poster_storage_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [restaurantId, name, emoji || null, poster_storage_id || null]
      );
      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: section,
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

    const body = await request.json();
    const { id, name, emoji, poster_storage_id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Section ID is required" },
        { status: 400 }
      );
    }

    const section = await withTenant(restaurantId, async (client) => {
      const result = await client.query(
        `UPDATE sections
         SET name = COALESCE($1, name),
             emoji = COALESCE($2, emoji),
             poster_storage_id = COALESCE($3, poster_storage_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND restaurant_id = $5
         RETURNING *`,
        [name, emoji, poster_storage_id, id, restaurantId]
      );
      return result.rows[0];
    });

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: section,
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

    const result = await withTenant(restaurantId, async (client) => {
      // Check if section is from Poster
      const checkResult = await client.query(
        `SELECT poster_storage_id FROM sections WHERE id = $1 AND restaurant_id = $2`,
        [sectionId, restaurantId]
      );

      if (checkResult.rows.length > 0 && checkResult.rows[0].poster_storage_id) {
        return { error: "Невозможно удалить секцию из Poster" };
      }

      const deleteResult = await client.query(
        `DELETE FROM sections WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
        [sectionId, restaurantId]
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
