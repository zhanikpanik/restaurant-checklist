import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const posterAppId = process.env.POSTER_APP_ID;
  const redirectUri = process.env.POSTER_REDIRECT_URI;

  console.log("🔐 OAuth Authorize:", { posterAppId, redirectUri });

  if (!posterAppId || !redirectUri) {
    console.error("❌ Missing OAuth credentials");
    return NextResponse.redirect(new URL("/setup?error=missing_oauth_config", request.url));
  }

  // Build the OAuth authorization URL
  const authUrl = new URL("https://joinposter.com/api/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", posterAppId);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  console.log("🔗 Redirecting to:", authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
