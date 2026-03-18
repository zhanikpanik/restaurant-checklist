import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Введите email" },
        { status: 400 }
      );
    }

    // 1. Find user by email
    const user = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT id, email FROM users WHERE email = $1 AND is_active = true",
        [email.toLowerCase()]
      );
      return result.rows[0];
    });

    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json({ 
        success: true, 
        message: "Если этот email существует, мы отправим на него письмо" 
      });
    }

    // 2. Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // 3. Save token to DB
    await withoutTenant(async (client) => {
      // Invalidate old tokens for this user
      await client.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );
      
      // Insert new token
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );
    });

    // 4. Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const resetLink = `${appUrl}/reset-password/${token}`;
    
    await sendPasswordResetEmail(user.email, resetLink);

    return NextResponse.json({ 
      success: true, 
      message: "Ссылка для сброса пароля отправлена на ваш email" 
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Произошла ошибка, попробуйте позже" },
      { status: 500 }
    );
  }
}
