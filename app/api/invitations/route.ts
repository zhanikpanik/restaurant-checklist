import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { withTenant, withoutTenant } from "@/lib/db";
import { randomBytes } from "crypto";

interface SectionPermission {
  section_id: number;
  can_send_orders: boolean;
  can_receive_supplies: boolean;
}

interface CreateInvitationRequest {
  name?: string;
  email?: string;
  role: "admin" | "manager" | "staff" | "delivery";
  sections: SectionPermission[];
  expires_in_days?: number;
}

// GET - List invitations (admin/manager only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const invitations = await withoutTenant(async (client) => {
      const result = await client.query(
        `SELECT 
          i.id,
          i.token,
          i.name,
          i.email,
          i.role,
          i.sections,
          i.status,
          i.created_at,
          i.expires_at,
          i.accepted_at,
          u.name as accepted_by_name,
          creator.name as created_by_name
         FROM invitations i
         LEFT JOIN users u ON u.id = i.user_id
         LEFT JOIN users creator ON creator.id = i.created_by
         WHERE i.restaurant_id = $1
         ORDER BY i.created_at DESC
         LIMIT 50`,
        [session.user.restaurantId]
      );
      return result.rows;
    });

    return NextResponse.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

// POST - Create invitation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can create invitations" },
        { status: 403 }
      );
    }

    const body: CreateInvitationRequest = await request.json();
    const { name, email, role, sections, expires_in_days } = body;

    // Validation
    if (!role || !["admin", "manager", "staff", "delivery"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one section must be assigned" },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 7));

    // Create invitation
    await withoutTenant(async (client) => {
      await client.query(
        `INSERT INTO invitations (
          token, restaurant_id, name, email, role, sections,
          expires_at, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          token,
          session.user.restaurantId,
          name || null,
          email?.toLowerCase() || null,
          role,
          JSON.stringify(sections),
          expiresAt,
          session.user.id,
          "pending",
        ]
      );
    });

    // Build invitation URL
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const invitationUrl = `${protocol}://${host}/register/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: invitationUrl,
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/expire invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    await withoutTenant(async (client) => {
      await client.query(
        `UPDATE invitations 
         SET status = 'expired' 
         WHERE token = $1 AND restaurant_id = $2 AND status = 'pending'`,
        [token, session.user.restaurantId]
      );
    });

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
