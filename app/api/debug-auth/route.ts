import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Debug endpoint to check auth config (remove in production later)
export async function GET() {
  const authSecret = process.env.AUTH_SECRET;
  const authUrl = process.env.AUTH_URL;
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  return NextResponse.json({
    hasAuthSecret: !!authSecret,
    authSecretLength: authSecret?.length || 0,
    authSecretPrefix: authSecret?.substring(0, 4) || "none",
    authSecretSuffix: authSecret?.substring(authSecret.length - 4) || "none",
    authUrl: authUrl || "not set",
    nodeEnv: process.env.NODE_ENV,
    cookies: allCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
  });
}
