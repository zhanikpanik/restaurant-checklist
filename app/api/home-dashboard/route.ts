import { NextRequest, NextResponse } from "next/server";
import { withTenant, withTenantBatch } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

interface Section {
  id: string;
  name: string;
  emoji: string;
  poster_storage_id?: string;
  custom_products_count?: number;
}

interface DashboardData {
  sections: Section[];
  userSectionIds: number[];
  orderSummary: {
    type: "pending" | "transit" | "last_order";
    count: number;
    departments?: Record<string, number>;
    suppliers?: Record<string, number>;
    lastOrder?: any;
  } | null;
  unsortedCount: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { restaurantId, userId, userRole } = auth;

    const isAdminOrManager = userId && userRole && ["admin", "manager"].includes(userRole);

    // ── Single DB connection for all 4 queries ──────
    const [sections, userSections, orders, unsortedCount] = await withTenantBatch(restaurantId, [
      // 1. All sections
      async (client) => {
        const result = await client.query(
          `SELECT
            s.id, s.name, s.emoji, s.poster_storage_id,
            COUNT(sp.id)::int as custom_products_count
          FROM sections s
          LEFT JOIN section_products sp ON sp.section_id = s.id AND sp.is_active = true
          WHERE s.restaurant_id = $1
          GROUP BY s.id, s.name, s.emoji, s.poster_storage_id
          ORDER BY s.name`,
          [restaurantId]
        );
        return result.rows as Section[];
      },

      // 2. User's assigned section IDs
      async (client) => {
        if (!userId) return [];
        const result = await client.query(
          `SELECT s.id FROM user_sections us
           JOIN sections s ON s.id = us.section_id
           WHERE us.user_id = $1 AND s.is_active = true`,
          [userId]
        );
        return result.rows.map((r: any) => parseInt(r.id, 10));
      },

      // 3. Recent orders for summary (last 50)
      async (client) => {
        const result = await client.query(
          `SELECT id, status, order_data, created_at, updated_at, delivered_at
           FROM orders
           WHERE restaurant_id = $1
           ORDER BY created_at DESC
           LIMIT 50`,
          [restaurantId]
        );
        return result.rows;
      },

      // 4. Unsorted count (admin/manager only)
      async (client) => {
        if (!isAdminOrManager) return null;
        const result = await client.query(
          `SELECT COUNT(sp.id)::int as count
           FROM section_products sp
           LEFT JOIN product_categories pc ON sp.category_id = pc.id
           LEFT JOIN sections s ON sp.section_id = s.id
           WHERE s.restaurant_id = $1
             AND sp.supplier_id IS NULL
             AND pc.supplier_id IS NULL
             AND sp.is_active = true`,
          [restaurantId]
        );
        return parseInt(result.rows[0].count, 10);
      },
    ]);

    // Compute order summary
    let orderSummary: DashboardData["orderSummary"] = null;

    const pending = orders.filter((o: any) => o.status === "pending");
    const sent = orders.filter((o: any) => o.status === "sent");

    if (pending.length > 0) {
      const deptCounts: Record<string, number> = {};
      pending.forEach((o: any) => {
        const dept = o.order_data?.department || "Unknown";
        deptCounts[dept] = (deptCounts[dept] || 0) + (o.order_data?.items?.length || 0);
      });
      orderSummary = { type: "pending", count: pending.length, departments: deptCounts };
    } else if (sent.length > 0) {
      const supplierCounts: Record<string, number> = {};
      sent.forEach((o: any) => {
        o.order_data?.items?.forEach((i: any) => {
          if (i.supplier) supplierCounts[i.supplier] = (supplierCounts[i.supplier] || 0) + 1;
        });
      });
      orderSummary = { type: "transit", count: sent.length, suppliers: supplierCounts };
    } else if (orders.length > 0) {
      orderSummary = { type: "last_order", count: 1, lastOrder: orders[0] };
    }

    const data: DashboardData = {
      sections,
      userSectionIds: userSections || [],
      orderSummary,
      unsortedCount,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching home dashboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
