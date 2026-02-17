import { NextRequest, NextResponse } from "next/server";
import { withTenant, withoutTenant } from "@/lib/db";
import { hash } from "bcryptjs";

interface AcceptInvitationRequest {
  token: string;
  name: string;
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AcceptInvitationRequest = await request.json();
    const { token, name, email, password } = body;

    // Validation
    if (!token || !name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate invitation
    const invitation = await withoutTenant(async (client) => {
      const result = await client.query(
        `SELECT * FROM invitations 
         WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
        [token]
      );
      return result.rows[0];
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Приглашение недействительно или истекло" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()]
      );
      return result.rows[0];
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Create user and assign sections
    const passwordHash = await hash(password, 12);

    await withoutTenant(async (client) => {
      await client.query("BEGIN");

      try {
        // Create user
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, name, role, restaurant_id, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [
            email.toLowerCase(),
            passwordHash,
            name,
            invitation.role,
            invitation.restaurant_id,
          ]
        );

        const userId = userResult.rows[0].id;

        // Assign sections with permissions
        const sections = invitation.sections as any[];
        
        await withTenant(invitation.restaurant_id, async (tenantClient) => {
          for (const section of sections) {
            await tenantClient.query(
              `INSERT INTO user_sections (user_id, section_id, can_send_orders, can_receive_supplies)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, section_id) DO UPDATE
               SET can_send_orders = $3, can_receive_supplies = $4`,
              [
                userId,
                section.section_id,
                section.can_send_orders || false,
                section.can_receive_supplies || false,
              ]
            );
          }
        });

        // Mark invitation as accepted
        await client.query(
          `UPDATE invitations 
           SET status = 'accepted', user_id = $1, accepted_at = NOW()
           WHERE id = $2`,
          [userId, invitation.id]
        );

        await client.query("COMMIT");

        console.log(`User registered successfully: ${email}, userId: ${userId}`);

        return NextResponse.json({
          success: true,
          message: "Регистрация завершена успешно",
          data: {
            user_id: userId,
            email: email.toLowerCase(),
          },
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Email уже используется" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Ошибка регистрации" },
      { status: 500 }
    );
  }
}
