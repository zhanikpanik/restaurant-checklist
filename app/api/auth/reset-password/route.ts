import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    return await withoutTenant(async (client) => {
      await client.query("BEGIN");

      try {
        // 1. Verify token
        const tokenResult = await client.query(
          `SELECT user_id FROM password_reset_tokens 
           WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
          [token]
        );

        const resetRecord = tokenResult.rows[0];

        if (!resetRecord) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { success: false, error: "Ссылка недействительна или устарела" },
            { status: 400 }
          );
        }

        // 2. Hash new password and update user
        const passwordHash = await hash(password, 12);
        
        await client.query(
          "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
          [passwordHash, resetRecord.user_id]
        );

        // 3. Mark token as used
        await client.query(
          "UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1",
          [token]
        );

        await client.query("COMMIT");

        return NextResponse.json({ 
          success: true, 
          message: "Пароль успешно изменен" 
        });

      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
}
