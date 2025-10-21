import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  // Helper to build proper redirect URL
  const getRedirectUrl = (path: string) => {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'restaurant-checklist-production.up.railway.app';
    return `${protocol}://${host}${path}`;
  };

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const account = searchParams.get("account");
    const error = searchParams.get("error");

    console.log("📥 Callback params:", {
      code: code?.substring(0, 20) + "...",
      account,
    });

    if (error) {
      console.error("❌ OAuth error:", error);
      return NextResponse.redirect(getRedirectUrl(`/setup?error=${encodeURIComponent(error)}`));
    }

    if (!code) {
      console.error("❌ No code received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_code"));
    }

    if (!account) {
      console.error("❌ No account received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_account"));
    }

    // Exchange code for token
    const tokenEndpoint = `https://${account}.joinposter.com/api/auth/access_token`;
    console.log("🔗 Token endpoint:", tokenEndpoint);

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.POSTER_APP_ID!,
        client_secret: process.env.POSTER_APP_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: process.env.POSTER_REDIRECT_URI!,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token exchange failed:", errorText);
      return NextResponse.redirect(getRedirectUrl("/setup?error=token_exchange_failed"));
    }

    const tokenData = await tokenResponse.json();
    console.log("📦 Token response:", tokenData);

    const access_token = tokenData.new_access_token || tokenData.access_token;
    const account_number = tokenData.account_number;

    if (!access_token) {
      console.error("❌ No access token received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_token"));
    }

    console.log(`✅ Using token format: ${access_token.substring(0, 10)}...`);

    // Get account info
    const accountResponse = await fetch(
      `https://${account}.joinposter.com/api/settings.getAllSettings?token=${access_token}`
    );
    const accountData = await accountResponse.json();

    const restaurantName = accountData.response?.name || account_number || "New Restaurant";
    const restaurantId = account_number || `restaurant_${Date.now()}`;

    if (!pool) {
      return NextResponse.redirect(getRedirectUrl("/setup?error=database_error"));
    }

    // Store restaurant in database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        "SELECT id FROM restaurants WHERE poster_account_name = $1",
        [account_number]
      );

      if (existingResult.rows.length > 0) {
        await client.query(
          `UPDATE restaurants
           SET poster_token = $1,
               name = $2,
               is_active = true
           WHERE poster_account_name = $3`,
          [access_token, restaurantName, account_number]
        );
        console.log("✅ Updated existing restaurant:", account_number);
      } else {
        await client.query(
          `INSERT INTO restaurants (
            id, name, logo, primary_color, currency,
            poster_token, poster_account_name, poster_base_url,
            kitchen_storage_id, bar_storage_id,
            timezone, language, whatsapp_enabled, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            restaurantId,
            restaurantName,
            "🍽️",
            "#3B82F6",
            "₽",
            access_token,
            account_number,
            "https://joinposter.com/api",
            1,
            2,
            "Europe/Moscow",
            "ru",
            true,
            true,
          ]
        );
        console.log("✅ Created new restaurant:", restaurantId);
      }

      await client.query("COMMIT");

      const response = NextResponse.redirect(getRedirectUrl("/setup?success=oauth"));
      response.cookies.set("restaurant_id", restaurantId, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });

      console.log(`✅ OAuth complete, restaurant: ${restaurantId}`);
      return response;
    } catch (dbError) {
      await client.query("ROLLBACK");
      console.error("❌ Database error:", dbError);
      return NextResponse.redirect(getRedirectUrl("/setup?error=database_error"));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return NextResponse.redirect(getRedirectUrl("/setup?error=unknown"));
  }
}
