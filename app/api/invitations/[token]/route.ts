import { NextRequest, NextResponse } from "next/server";
import { withTenant, withoutTenant } from "@/lib/db";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const params = await props.params;
    const token = params.token;

    // Fetch invitation
    const invitation = await withoutTenant(async (client) => {
      const result = await client.query(
        `SELECT i.*, r.name as restaurant_name
         FROM invitations i
         JOIN restaurants r ON r.id = i.restaurant_id
         WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
        [token]
      );
      return result.rows[0];
    });

    if (!invitation) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Приглашение недействительно или истекло" 
        },
        { status: 404 }
      );
    }

    // Fetch section details
    const sections = await withTenant(invitation.restaurant_id, async (client) => {
      const sectionPermissions = invitation.sections as any[];
      const sectionIds = sectionPermissions.map((s: any) => s.section_id);
      
      const result = await client.query(
        `SELECT id, name, emoji FROM sections WHERE id = ANY($1) AND is_active = true`,
        [sectionIds]
      );
      
      // Merge section details with permissions
      return sectionPermissions.map((perm: any) => {
        const section = result.rows.find((r: any) => r.id === perm.section_id);
        return {
          section_id: perm.section_id,
          section_name: section?.name || "Unknown",
          section_emoji: section?.emoji || "📍",
          can_send_orders: perm.can_send_orders || false,
          can_receive_supplies: perm.can_receive_supplies || false,
        };
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        restaurant_name: invitation.restaurant_name,
        restaurant_id: invitation.restaurant_id,
        sections,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
