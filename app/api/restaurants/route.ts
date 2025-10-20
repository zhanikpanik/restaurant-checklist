import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { Restaurant, ApiResponse } from "@/types";

// GET /api/restaurants - Get all restaurants
export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database connection not available" },
        { status: 500 }
      );
    }

    const result = await pool.query<Restaurant>(
      `SELECT * FROM restaurants
       WHERE is_active = true
       ORDER BY name`
    );

    return NextResponse.json<ApiResponse<Restaurant[]>>({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}