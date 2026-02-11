import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const restaurantCookie = request.cookies.get("restaurant_id");
    if (!restaurantCookie?.value) {
      return NextResponse.json(
        { success: false, error: "No restaurant selected" },
        { status: 401 }
      );
    }

    const restaurantId = restaurantCookie.value;

    if (!pool) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `SELECT * FROM webhook_logs 
       WHERE restaurant_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [restaurantId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
