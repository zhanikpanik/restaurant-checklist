// Poster OAuth callback endpoint
import pool from "../../../../lib/db.js";

export const prerender = false;

export async function GET({ url, redirect }) {
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("❌ OAuth error:", error);
      return redirect(`/setup?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return redirect("/setup?error=no_code");
    }

    // Exchange code for token using correct Poster OAuth parameters
    const tokenResponse = await fetch(
      "https://joinposter.com/api/auth/access_token",
      {
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
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token exchange failed:", errorText);
      return redirect(`/setup?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log("📦 Token response:", tokenData);

    const { access_token, account_number } = tokenData;

    if (!access_token) {
      console.error(
        "❌ No access token received, full response:",
        JSON.stringify(tokenData),
      );
      return redirect("/setup?error=no_token");
    }

    // Get account info to get restaurant name
    const accountResponse = await fetch(
      `https://joinposter.com/api/settings.getAllSettings?token=${access_token}`,
    );
    const accountData = await accountResponse.json();

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

      // Redirect to manager page with tenant set
      return redirect(`/manager?tenant=${restaurantId}&success=oauth`);
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
