"use client";

import { Badge } from "@/components/ui/Badge";
import type { Order } from "@/types";

interface DeliveredTabProps {
  orders: Order[];
  loading: boolean;
  onViewOrder: (order: Order) => void;
}

export function DeliveredTab({ orders, loading, onViewOrder }: DeliveredTabProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Загрузка доставленных заказов...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4 px-2">
        Доставленные заказы ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет доставленных заказов</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">#{order.id}</span>
                  <Badge variant="success">✓ Доставлен</Badge>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Дата доставки</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(order.delivered_at || order.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Товаров</p>
                  <p className="text-sm font-medium text-gray-900">
                    {order.order_data.items?.length || 0} шт
                  </p>
                </div>
                {order.order_data.department && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Отдел</p>
                    <p className="text-sm font-medium text-gray-900">
                      {order.order_data.department}
                    </p>
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <button
                onClick={() => onViewOrder(order)}
                className="w-full bg-white hover:bg-gray-50 border-2 border-green-200 text-green-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
              >
                Просмотр деталей
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
