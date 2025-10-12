// Poster OAuth authorization endpoint
// Redirects user to Poster's OAuth page with correct credentials

export const prerender = false;

export async function GET({ redirect }) {
  // Access env vars (Railway sets these as process.env, dev uses import.meta.env)
  const posterAppId =
    import.meta.env.POSTER_APP_ID || process.env.POSTER_APP_ID;
  const redirectUri =
    import.meta.env.POSTER_REDIRECT_URI || process.env.POSTER_REDIRECT_URI;

  console.log("🔐 OAuth Authorize:", { posterAppId, redirectUri });

  if (!posterAppId || !redirectUri) {
    console.error("❌ Missing OAuth credentials");
    return redirect("/setup?error=missing_oauth_config");
  }

  // Build the OAuth authorization URL
  // Poster requires application_id and redirect_uri as query params
  const authUrl = new URL("https://joinposter.com/api/v2/auth/manage");
  authUrl.searchParams.set("application_id", posterAppId);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  console.log("🔗 Redirecting to:", authUrl.toString());

  // Redirect to Poster's OAuth page
  return redirect(authUrl.toString());
}
