import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * @deprecated The products table has been dropped.
 * Use section_products for Poster-synced products or custom_products for app-created products.
 * 
 * This route is kept for backwards compatibility but returns a deprecation notice.
 */

// GET /api/products - Deprecated
export async function GET(request: NextRequest) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "This endpoint is deprecated. Use /api/section-products instead.",
    },
    { status: 410 } // Gone
  );
}

// POST /api/products - Deprecated
export async function POST(request: NextRequest) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "This endpoint is deprecated. Use /api/section-products or /api/custom-products instead.",
    },
    { status: 410 }
  );
}

// PATCH /api/products - Deprecated
export async function PATCH(request: NextRequest) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "This endpoint is deprecated. Use /api/section-products or /api/custom-products instead.",
    },
    { status: 410 }
  );
}

// DELETE /api/products - Deprecated
export async function DELETE(request: NextRequest) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "This endpoint is deprecated. Use /api/section-products or /api/custom-products instead.",
    },
    { status: 410 }
  );
}
