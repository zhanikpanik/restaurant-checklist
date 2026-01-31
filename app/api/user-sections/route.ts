import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withTenant, withoutTenant } from "@/lib/db";

// GET - Get sections assigned to a user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    
    // If user_id provided and user is admin, get that user's sections
    // Otherwise get current user's sections
    const targetUserId = userId && session.user.role === "admin" 
      ? parseInt(userId) 
      : parseInt(session.user.id);

    const sections = await withTenant(session.user.restaurantId, async (client) => {
      const result = await client.query(
        `SELECT s.id, s.name, s.emoji, s.poster_storage_id
         FROM user_sections us
         JOIN sections s ON s.id = us.section_id
         WHERE us.user_id = $1 AND s.is_active = true
         ORDER BY s.name`,
        [targetUserId]
      );
      return result.rows;
    });

    return NextResponse.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Error fetching user sections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user sections" },
      { status: 500 }
    );
  }
}

// POST - Assign sections to a user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can assign sections
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can assign sections" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, section_ids } = body;

    if (!user_id || !Array.isArray(section_ids)) {
      return NextResponse.json(
        { success: false, error: "user_id and section_ids array are required" },
        { status: 400 }
      );
    }

    await withTenant(session.user.restaurantId, async (client) => {
      // First, remove all existing assignments for this user
      await client.query(
        `DELETE FROM user_sections 
         WHERE user_id = $1 
         AND section_id IN (SELECT id FROM sections)`,
        [user_id]
      );

      // Then, insert new assignments
      if (section_ids.length > 0) {
        const values = section_ids.map((sectionId: number, index: number) => 
          `($1, $${index + 2})`
        ).join(", ");
        
        await client.query(
          `INSERT INTO user_sections (user_id, section_id) VALUES ${values}
           ON CONFLICT (user_id, section_id) DO NOTHING`,
          [user_id, ...section_ids]
        );
      }
    });

    return NextResponse.json({
      success: true,
      message: "Sections assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning sections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign sections" },
      { status: 500 }
    );
  }
}

// DELETE - Remove section assignment (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can modify section assignments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const sectionId = searchParams.get("section_id");

    if (!userId || !sectionId) {
      return NextResponse.json(
        { success: false, error: "user_id and section_id are required" },
        { status: 400 }
      );
    }

    await withoutTenant(async (client) => {
      await client.query(
        `DELETE FROM user_sections WHERE user_id = $1 AND section_id = $2`,
        [parseInt(userId), parseInt(sectionId)]
      );
    });

    return NextResponse.json({
      success: true,
      message: "Section assignment removed",
    });
  } catch (error) {
    console.error("Error removing section assignment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove section assignment" },
      { status: 500 }
    );
  }
}
