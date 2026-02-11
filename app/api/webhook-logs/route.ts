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

    // Fetch logs for this restaurant OR system logs (unmatched webhooks)
    const result = await pool.query(
      `SELECT * FROM webhook_logs 
       WHERE restaurant_id = $1 OR restaurant_id = 'system-logs'
       ORDER BY created_at DESC 
       LIMIT 50`,
      [restaurantId]
    );

    // If no logs found, return empty array
    if (result.rows.length === 0) {
       console.log("No logs found for restaurant:", restaurantId);
    }
    
    // Convert payloads from string to JSON if needed (pg auto-converts JSONB but just in case)
    const logs = result.rows.map(row => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    }));

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
