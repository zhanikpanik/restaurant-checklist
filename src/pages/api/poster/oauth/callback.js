// Poster OAuth callback endpoint
import pool from "../../../../lib/db.js";

export const prerender = false;

export async function GET({ url, redirect }) {
  try {
    const code = url.searchParams.get("code");
    const account = url.searchParams.get("account");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("📥 Callback params:", {
      code: code?.substring(0, 20) + "...",
      account,
      state,
    });

    if (error) {
      console.error("❌ OAuth error:", error);
      return redirect(`/setup?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error("❌ No code received");
      return redirect("/setup?error=no_code");
    }

    if (!account) {
      console.error("❌ No account received");
      return redirect("/setup?error=no_account");
    }

    // Exchange code for token using correct Poster OAuth parameters
    // Token endpoint must use account-specific subdomain
    const tokenEndpoint = `https://${account}.joinposter.com/api/auth/access_token`;
    console.log("🔗 Token endpoint:", tokenEndpoint);

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.POSTER_APP_ID,
        client_secret: process.env.POSTER_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: process.env.POSTER_REDIRECT_URI,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token exchange failed:", errorText);
      return redirect(`/setup?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log("📦 Token response:", tokenData);

    // Poster returns both 'access_token' and 'new_access_token'
    // 'new_access_token' is in format 'account_number:token' which is required for API calls
    const access_token = tokenData.new_access_token || tokenData.access_token;
    const account_number = tokenData.account_number;

    if (!access_token) {
      console.error(
        "❌ No access token received, full response:",
        JSON.stringify(tokenData),
      );
      return redirect("/setup?error=no_token");
    }

    console.log(`✅ Using token format: ${access_token.substring(0, 10)}...`);

    // Get account info to get restaurant name (use account-specific subdomain)
    const accountResponse = await fetch(
      `https://${account}.joinposter.com/api/settings.getAllSettings?token=${access_token}`,
    );
    const accountData = await accountResponse.json();
    console.log(
      `📋 Account info retrieved for: ${accountData.response?.name || account}`,
    );

    const restaurantName =
      accountData.response?.name || account_number || "New Restaurant";
    const restaurantId = account_number || `restaurant_${Date.now()}`;

    // Store or update restaurant in database
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if restaurant exists
      const existingResult = await client.query(
        "SELECT id FROM restaurants WHERE poster_account_name = $1",
        [account_number],
      );

      if (existingResult.rows.length > 0) {
        // Update existing
        await client.query(
          `UPDATE restaurants
           SET poster_token = $1,
               name = $2,
               is_active = true,
               updated_at = CURRENT_TIMESTAMP
           WHERE poster_account_name = $3`,
          [access_token, restaurantName, account_number],
        );
        console.log("✅ Updated existing restaurant:", account_number);
      } else {
        // Insert new
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
            1, // kitchen_storage_id
            2, // bar_storage_id
            "Europe/Moscow",
            "ru",
            true,
            true,
          ],
        );
        console.log("✅ Created new restaurant:", restaurantId);
      }

      await client.query("COMMIT");

      // Set tenant cookie to persist the tenant across page navigation
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: `/manager?tenant=${restaurantId}&success=oauth`,
          "Set-Cookie": `tenant=${restaurantId}; Path=/; Max-Age=31536000; SameSite=Lax`,
        },
      });

      console.log(`✅ OAuth complete, redirecting to tenant: ${restaurantId}`);
      return response;
    } catch (dbError) {
      await client.query("ROLLBACK");
      console.error("❌ Database error:", dbError);
      return redirect("/setup?error=database_error");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return redirect("/setup?error=unknown");
  }
}
