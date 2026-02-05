import { NextResponse } from "next/server";

// Debug endpoint - DISABLED in production
// Only shows basic config check, no secrets
export async function GET() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Not available in production" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasAuthUrl: !!process.env.AUTH_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    // Never expose actual secret values, even partially
  });
}
