import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { generateCSRFToken, getSessionIdentifier } from "@/lib/csrf-edge";
import { cookies } from "next/headers";

/**
 * GET /api/csrf - Get a new CSRF token
 * 
 * This endpoint generates a CSRF token tied to the current session.
 * The token should be included in the X-CSRF-Token header for all
 * mutating requests (POST, PUT, PATCH, DELETE).
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get session token from cookies for session identifier
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get("authjs.session-token") 
      || cookieStore.get("__Secure-authjs.session-token");
    
    const sessionIdentifier = await getSessionIdentifier(
      sessionTokenCookie?.value,
      session.user.id
    );

    // Generate CSRF token (async with Web Crypto API)
    const csrfToken = await generateCSRFToken(sessionIdentifier);

    // Return token and set it in a cookie for middleware access
    const response = NextResponse.json({
      success: true,
      data: { csrfToken },
    });

    // Also set the session identifier in a cookie for validation
    // This is httpOnly so it can't be read by JavaScript
    response.cookies.set("csrf-session-id", sessionIdentifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour, matches token expiry
    });

    return response;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
