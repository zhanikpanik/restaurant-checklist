import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

// Generate a secure random password
function generateTempPassword(): string {
  return randomBytes(8).toString("base64").slice(0, 12);
}

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

    console.log("Callback params:", {
      code: code?.substring(0, 20) + "...",
      account,
    });

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(getRedirectUrl(`/setup?error=${encodeURIComponent(error)}`));
    }

    if (!code) {
      console.error("No code received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_code"));
    }

    if (!account) {
      console.error("No account received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_account"));
    }

    // Exchange code for token
    const tokenEndpoint = `https://${account}.joinposter.com/api/auth/access_token`;
    console.log("Token endpoint:", tokenEndpoint);

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
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(getRedirectUrl("/setup?error=token_exchange_failed"));
    }

    const tokenData = await tokenResponse.json();
    console.log("Token response received, ownerInfo:", tokenData.ownerInfo ? "present" : "missing");

    const access_token = tokenData.new_access_token || tokenData.access_token;
    const account_number = tokenData.account_number;
    
    // Extract owner info from token response
    const ownerEmail = tokenData.ownerInfo?.email;
    const ownerName = tokenData.ownerInfo?.name || tokenData.ownerInfo?.company_name;

    if (!access_token) {
      console.error("No access token received");
      return NextResponse.redirect(getRedirectUrl("/setup?error=no_token"));
    }

    // Get account info (for restaurant name fallback)
    const accountResponse = await fetch(
      `https://${account}.joinposter.com/api/settings.getAllSettings?token=${access_token}`
    );
    const accountData = await accountResponse.json();

    // Use settings data as fallback for owner info
    const finalOwnerEmail = ownerEmail || accountData.response?.email;
    const finalOwnerName = ownerName || accountData.response?.name || "Admin";
    const restaurantName = accountData.response?.company_name || accountData.response?.name || account_number || "New Restaurant";
    const restaurantId = account_number || `restaurant_${Date.now()}`;

    // Store restaurant and create admin user
    try {
      let finalRestaurantId = restaurantId;
      let tempPassword: string | null = null;
      let adminCreated = false;
      let adminEmail = finalOwnerEmail;
      
      await withoutTenant(async (client) => {
        await client.query("BEGIN");

        try {
          const existingResult = await client.query(
            "SELECT id FROM restaurants WHERE poster_account_name = $1",
            [account]
          );

          if (existingResult.rows.length > 0) {
            // Use the existing restaurant's ID
            finalRestaurantId = existingResult.rows[0].id;
            await client.query(
              `UPDATE restaurants
               SET poster_token = $1,
                   name = $2,
                   is_active = true
               WHERE poster_account_name = $3`,
              [access_token, restaurantName, account]
            );
            console.log("Updated existing restaurant:", finalRestaurantId);
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
                account,  // Use subdomain, not account_number
                `https://${account}.joinposter.com/api`,
                1,
                2,
                "Europe/Moscow",
                "ru",
                true,
                true,
              ]
            );
            console.log("Created new restaurant:", restaurantId);
          }

          // Check if admin user exists for this restaurant
          if (finalOwnerEmail) {
            const existingUser = await client.query(
              "SELECT id FROM users WHERE email = $1",
              [finalOwnerEmail.toLowerCase()]
            );

            if (existingUser.rows.length === 0) {
              // Create admin user with temp password
              tempPassword = generateTempPassword();
              const passwordHash = await hash(tempPassword, 12);

              await client.query(
                `INSERT INTO users (email, password_hash, name, role, restaurant_id, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  finalOwnerEmail.toLowerCase(),
                  passwordHash,
                  finalOwnerName,
                  "admin",
                  finalRestaurantId,
                  true,
                ]
              );
              adminCreated = true;
              console.log("Created admin user:", finalOwnerEmail);
            } else {
              console.log("User already exists:", finalOwnerEmail);
            }
          }

          await client.query("COMMIT");
        } catch (dbError) {
          await client.query("ROLLBACK");
          throw dbError;
        }
      });

      // Build redirect URL with credentials if admin was created
      let redirectPath = "/setup?success=oauth";
      if (adminCreated && tempPassword && adminEmail) {
        redirectPath += `&admin_created=true&email=${encodeURIComponent(adminEmail)}&temp_password=${encodeURIComponent(tempPassword)}`;
      }

      const response = NextResponse.redirect(getRedirectUrl(redirectPath));
      response.cookies.set("restaurant_id", finalRestaurantId, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });

      console.log(`OAuth complete, restaurant: ${finalRestaurantId}, admin created: ${adminCreated}`);
      return response;
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(getRedirectUrl("/setup?error=database_error"));
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(getRedirectUrl("/setup?error=unknown"));
  }
}
