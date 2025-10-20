import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get tenant from cookie
    const tenantCookie = request.cookies.get("tenant");
    const tenant = tenantCookie?.value || "unknown";

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Fetch sections for the current tenant
    const result = await pool.query(
      `SELECT
        s.id,
        s.name,
        s.emoji,
        s.poster_storage_id,
        COUNT(cp.id) as custom_products_count
      FROM sections s
      LEFT JOIN custom_products cp ON cp.section_id = s.id
      WHERE s.tenant_id = $1
      GROUP BY s.id, s.name, s.emoji, s.poster_storage_id
      ORDER BY s.name`,
      [tenant]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}