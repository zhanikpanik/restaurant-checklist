"use client";

import Link from "next/link";
import { formatRelativeDate } from "@/lib/plural";
import type { Order } from "@/types";

interface OrderSummary {
  type: "pending" | "transit" | "last_order";
  count: number;
  departments?: Record<string, number>;
  suppliers?: Record<string, number>;
  lastOrder?: Order;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending": return "Ожидает";
    case "sent": return "Отправлен";
    case "delivered": return "Доставлен";
    case "cancelled": return "Отменен";
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "sent": return "bg-blue-100 text-blue-800";
    case "delivered": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function HomeStatusCard({ summary }: { summary: OrderSummary }) {
  if (summary.type === "pending") {
    const deptNames = summary.departments
      ? Object.keys(summary.departments).join(", ")
      : "";

    return (
      <Link
        href="/orders"
        className="w-full active:bg-black/5 transition-colors block border-b border-gray-100/80"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/icons/list.svg" alt="Pending" className="w-8 h-8 opacity-40" />
            <div>
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <span className="font-medium">
                  {summary.count} {summary.count === 1 ? "заказ" : "заказа"}
                </span>
                <span>·</span>
                <span>Ожидают отправки</span>
              </p>
              <p className="text-sm text-[#1a1008] font-medium">{deptNames}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  if (summary.type === "transit") {
    const supplierNames = summary.suppliers
      ? Object.keys(summary.suppliers).join(", ")
      : "";

    return (
      <Link
        href="/orders"
        className="w-full active:bg-black/5 transition-colors block border-b border-gray-100/80"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/icons/delivery.svg" alt="Transit" className="w-8 h-8 opacity-40" />
            <div>
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <span className="font-medium">
                  {summary.count} {summary.count === 1 ? "поставка" : "поставки"}
                </span>
                <span>·</span>
                <span>В пути</span>
              </p>
              <p className="text-sm text-[#1a1008] font-medium">{supplierNames}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  // Last Order (History)
  if (summary.type === "last_order" && summary.lastOrder) {
    const order = summary.lastOrder;
    return (
      <Link
        href="/orders"
        className="w-full active:bg-black/5 transition-colors block border-b border-gray-100/80"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/icons/box.svg" alt="Order" className="w-8 h-8 opacity-40" />
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <span>·</span>
                <span>{formatRelativeDate(order.created_at)}</span>
              </p>
              <p className="text-sm text-[#1a1008] font-medium">Последний заказ</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  return null;
}
