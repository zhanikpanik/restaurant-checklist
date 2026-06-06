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
        className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/list.svg" alt="Pending" className="w-9 h-9 opacity-70" />
            <div>
              <p className="text-xs text-yellow-700 flex items-center gap-2">
                <span className="font-bold">
                  {summary.count} {summary.count === 1 ? "заказ" : "заказа"}
                </span>
                <span>•</span>
                <span>Ожидают отправки</span>
              </p>
              <p className="text-sm font-semibold text-gray-800">{deptNames}</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/delivery.svg" alt="Transit" className="w-9 h-9 opacity-70" />
            <div>
              <p className="text-xs text-blue-700 flex items-center gap-2">
                <span className="font-bold">
                  {summary.count} {summary.count === 1 ? "поставка" : "поставки"}
                </span>
                <span>•</span>
                <span>В пути</span>
              </p>
              <p className="text-sm font-semibold text-gray-800">{supplierNames}</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        className="w-full bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/box.svg" alt="Order" className="w-9 h-9 opacity-70" />
            <div>
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <span>•</span>
                <span>{formatRelativeDate(order.created_at)}</span>
              </p>
              <p className="text-sm font-semibold text-gray-800">Последний заказ</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  return null;
}
