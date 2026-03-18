"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { clientCache, fetchWithCache } from "@/lib/client-cache";
import type { Order } from "@/types";

type OrderStatusFilter = "all" | "pending" | "sent" | "delivered" | "cancelled";

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>(() => clientCache.get("my_orders") || []);
  const [loading, setLoading] = useState(!clientCache.has("my_orders"));
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");

  useEffect(() => {
    if (status === "authenticated") {
      loadOrders();
    }
  }, [status]);

  const loadOrders = async () => {
    if (!orders.length) setLoading(true);
    try {
      const data = await fetchWithCache("/api/orders?my=true&limit=50");
      if (data?.success) {
        setOrders(data.data);
        clientCache.set("my_orders", data.data);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (orderStatus: string) => {
    switch (orderStatus) {
      case "pending": return "Ожидает";
      case "sent": return "Отправлен";
      case "delivered": return "Доставлен";
      case "cancelled": return "Отменен";
      default: return orderStatus;
    }
  };

  const getStatusColor = (orderStatus: string) => {
    switch (orderStatus) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-brand-100 text-brand-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date | string) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return `Сегодня, ${orderDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Вчера, ${orderDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return orderDate.toLocaleDateString("ru-RU", { 
        day: "numeric", 
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    sent: orders.filter((o) => o.status === "sent").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95 mr-3"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">Мои заказы</h1>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {(["all", "pending", "sent", "delivered", "cancelled"] as const).map((filterStatus) => (
              <button
                key={filterStatus}
                onClick={() => setStatusFilter(filterStatus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filterStatus
                    ? "bg-brand-100 text-brand-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filterStatus === "all" ? "Все" : getStatusLabel(filterStatus)}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === filterStatus ? "bg-brand-200" : "bg-gray-200"
                }`}>
                  {statusCounts[filterStatus]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {statusFilter === "all" ? "Заказов пока нет" : "Заказы не найдены"}
            </h3>
            <p className="text-gray-500 mb-4">
              {statusFilter === "all" 
                ? "Создайте первый заказ в любом отделе"
                : `Нет заказов со статусом "${getStatusLabel(statusFilter)}"`
              }
            </p>
            <Link
              href="/"
              className="inline-block bg-brand-500 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium"
            >
              Перейти к отделам
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      #{order.id}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      {order.order_data.department}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  {formatDate(order.created_at)}
                </div>

                {/* Items preview */}
                <div className="text-sm text-gray-700">
                  <div className="font-medium mb-1">
                    {order.order_data.items?.length || 0} товаров:
                  </div>
                  <div className="text-gray-500">
                    {order.order_data.items?.slice(0, 4).map((item, idx) => (
                      <span key={idx}>
                        {item.name} ({item.quantity} {item.unit})
                        {idx < Math.min(order.order_data.items!.length - 1, 3) && ", "}
                      </span>
                    ))}
                    {(order.order_data.items?.length || 0) > 4 && (
                      <span className="text-gray-400"> и ещё {order.order_data.items!.length - 4}...</span>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {order.order_data.notes && (
                  <div className="mt-2 text-sm text-gray-500 italic">
                    Примечание: {order.order_data.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
