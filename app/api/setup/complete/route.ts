import { NextRequest, NextResponse } from "next/server";
import { withoutTenant } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, email, name, password, restaurantId } = await request.json();

    if (!token || !email || !password || !restaurantId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const success = await withoutTenant(async (client) => {
      // 1. Verify token exists and is valid (stored as refresh_token for temporary storage)
      const tokenResult = await client.query(
        `SELECT restaurant_id FROM poster_tokens 
         WHERE access_token = $1 AND restaurant_id = $2 AND expires_at > NOW()`,
        [token, restaurantId]
      );

      if (tokenResult.rows.length === 0) {
        return { success: false, error: "Token invalid or expired" };
      }

      // 2. Check if user already exists
      const userResult = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (userResult.rows.length > 0) {
        return { success: false, error: "User with this email already exists" };
      }

      // 3. Create the user
      const passwordHash = await hash(password, 12);
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, restaurant_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [email.toLowerCase(), passwordHash, name || "Admin", "admin", restaurantId]
      );

      // 4. Delete the used setup token
      await client.query(
        "DELETE FROM poster_tokens WHERE access_token = $1 AND restaurant_id = $2",
        [token, restaurantId]
      );

      return { success: true };
    });

    if (!success.success) {
      return NextResponse.json(success, { status: 400 });
    }

    // TRIGGER BACKGROUND SYNC
    // We don't 'await' this so the user can proceed to login immediately
    // while the sync runs in the background.
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'restaurant-checklist-production.up.railway.app';
    const baseUrl = `${protocol}://${host}`;
    
    console.log(`📡 Triggering background sync for ${restaurantId} via ${baseUrl}...`);
    
    // Use a more robust fetch with the new header
    fetch(`${baseUrl}/api/sync-sections`, {
      method: 'POST',
      headers: { 
        'x-restaurant-id': restaurantId,
        'x-internal-sync': 'true'
      }
    }).then(async (res) => {
      const data = await res.json();
      console.log(`✅ Background sync trigger response for ${restaurantId}:`, data);
    }).catch(err => console.error(`❌ Background sync failed for ${restaurantId}:`, err));

    return NextResponse.json({ success: true, message: "Account created successfully" });
  } catch (error) {
    console.error("Setup completion error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
