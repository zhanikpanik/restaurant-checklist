import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withTenant } from "@/lib/db";
import type { UserSectionPermission, UserOrderPermissions } from "@/types";

// GET - Get sections assigned to a user (with permissions)
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
    const permissionsOnly = searchParams.get("permissions") === "true";
    
    // If user_id provided and user is admin/manager, get that user's sections
    // Otherwise get current user's sections
    const targetUserId = userId && ["admin", "manager"].includes(session.user.role || "") 
      ? parseInt(userId) 
      : parseInt(session.user.id);

    const userRole = session.user.role || "staff";
    const isAdminOrManager = ["admin", "manager"].includes(userRole);

    const sections = await withTenant(session.user.restaurantId, async (client) => {
      const result = await client.query(
        `SELECT s.id, s.name, s.emoji, s.poster_storage_id,
                COALESCE(us.can_send_orders, false) as can_send_orders,
                COALESCE(us.can_receive_supplies, false) as can_receive_supplies
         FROM user_sections us
         JOIN sections s ON s.id = us.section_id
         WHERE us.user_id = $1 AND s.is_active = true
         ORDER BY s.name`,
        [targetUserId]
      );
      return result.rows;
    });

    // If permissions only requested, return aggregated permissions
    if (permissionsOnly) {
      // If fetching for another user (manager querying), return section-level permissions
      if (userId && targetUserId !== parseInt(session.user.id)) {
        const sectionPerms = sections.map((s: any) => ({
          sectionId: s.id,
          canSendOrders: s.can_send_orders,
          canReceiveSupplies: s.can_receive_supplies,
        }));
        return NextResponse.json({ success: true, data: sectionPerms });
      }
      
      // Admin/Manager always has full permissions
      if (isAdminOrManager) {
        const permissions: UserOrderPermissions = {
          canSendOrders: true,
          canReceiveSupplies: true,
          sectionPermissions: sections.map((s: any) => ({
            user_id: targetUserId,
            section_id: s.id,
            section_name: s.name,
            can_send_orders: true,
            can_receive_supplies: true,
          })),
        };
        return NextResponse.json({ success: true, data: permissions });
      }

      // For other roles, aggregate permissions from their sections
      const sectionPermissions: UserSectionPermission[] = sections.map((s: any) => ({
        user_id: targetUserId,
        section_id: s.id,
        section_name: s.name,
        can_send_orders: s.can_send_orders,
        can_receive_supplies: s.can_receive_supplies,
      }));

      const permissions: UserOrderPermissions = {
        canSendOrders: sectionPermissions.some(p => p.can_send_orders),
        canReceiveSupplies: sectionPermissions.some(p => p.can_receive_supplies),
        sectionPermissions,
      };

      return NextResponse.json({ success: true, data: permissions });
    }

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

// POST - Assign sections to a user (admin/manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin/manager can assign sections
    if (!["admin", "manager"].includes(session.user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can assign sections" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, section_ids, sections, permissions } = body;

    // Support both old format (section_ids) and new format (sections with permissions embedded)
    let sectionAssignments: { section_id: number; can_send_orders: boolean; can_receive_supplies: boolean }[] = [];
    
    if (Array.isArray(sections)) {
      // New format: sections array with permissions
      sectionAssignments = sections.map((s: any) => ({
        section_id: s.section_id,
        can_send_orders: s.can_send_orders || false,
        can_receive_supplies: s.can_receive_supplies || false,
      }));
    } else if (Array.isArray(section_ids)) {
      // Old format: section_ids array with optional permissions array
      sectionAssignments = section_ids.map((sectionId: number) => {
        const perm = permissions?.find((p: any) => p.section_id === sectionId);
        return {
          section_id: sectionId,
          can_send_orders: perm?.can_send_orders || false,
          can_receive_supplies: perm?.can_receive_supplies || false,
        };
      });
    }

    if (!user_id || sectionAssignments.length === 0 && !Array.isArray(section_ids) && !Array.isArray(sections)) {
      return NextResponse.json(
        { success: false, error: "user_id and section_ids or sections array are required" },
        { status: 400 }
      );
    }

    await withTenant(session.user.restaurantId, async (client) => {
      // First, remove all existing assignments for this user (only for sections in this restaurant)
      await client.query(
        `DELETE FROM user_sections 
         WHERE user_id = $1 
         AND section_id IN (SELECT id FROM sections WHERE restaurant_id = $2)`,
        [user_id, session.user.restaurantId]
      );

      // Then, insert new assignments with permissions
      if (sectionAssignments.length > 0) {
        for (const assignment of sectionAssignments) {
          await client.query(
            `INSERT INTO user_sections (user_id, section_id, can_send_orders, can_receive_supplies)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, section_id) DO UPDATE SET
               can_send_orders = $3,
               can_receive_supplies = $4`,
            [user_id, assignment.section_id, assignment.can_send_orders, assignment.can_receive_supplies]
          );
        }
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

// PATCH - Update permissions for a user-section assignment (admin/manager only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin/manager can update permissions
    if (!["admin", "manager"].includes(session.user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can update permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, section_id, can_send_orders, can_receive_supplies } = body;

    if (!user_id || !section_id) {
      return NextResponse.json(
        { success: false, error: "user_id and section_id are required" },
        { status: 400 }
      );
    }

    await withTenant(session.user.restaurantId, async (client) => {
      // Verify section belongs to this restaurant
      const sectionCheck = await client.query(
        `SELECT id FROM sections WHERE id = $1 AND restaurant_id = $2`,
        [section_id, session.user.restaurantId]
      );

      if (sectionCheck.rows.length === 0) {
        throw new Error("Section not found in this restaurant");
      }

      // Update permissions
      await client.query(
        `UPDATE user_sections 
         SET can_send_orders = COALESCE($1, can_send_orders),
             can_receive_supplies = COALESCE($2, can_receive_supplies)
         WHERE user_id = $3 AND section_id = $4`,
        [can_send_orders, can_receive_supplies, user_id, section_id]
      );
    });

    return NextResponse.json({
      success: true,
      message: "Permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update permissions" },
      { status: 500 }
    );
  }
}

// DELETE - Remove section assignment (admin/manager only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can modify section assignments" },
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

    await withTenant(session.user.restaurantId, async (client) => {
      // Verify section belongs to this restaurant before deleting
      await client.query(
        `DELETE FROM user_sections 
         WHERE user_id = $1 
         AND section_id = $2
         AND section_id IN (SELECT id FROM sections WHERE restaurant_id = $3)`,
        [parseInt(userId), parseInt(sectionId), session.user.restaurantId]
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
