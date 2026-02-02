
import { Order } from "@/types";
import { Card, OrderStatusBadge } from "@/components/ui";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onDelete?: () => void;
  formatDate: (date: Date | string) => string;
}

export function OrderCard({ order, onClick, onDelete, formatDate }: OrderCardProps) {
  const formatNaturalDate = (date: Date | string) => {
    const orderDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const orderDateOnly = new Date(orderDate);
    orderDateOnly.setHours(0, 0, 0, 0);

    if (orderDateOnly.getTime() === today.getTime()) {
      return "Сегодня";
    } else if (orderDateOnly.getTime() === yesterday.getTime()) {
      return "Вчера";
    } else if (orderDateOnly.getTime() === dayBeforeYesterday.getTime()) {
      return "Позавчера";
    } else {
      return orderDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
    }
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      className="hover:border-blue-300 transition-all shadow-sm"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">
            {formatNaturalDate(order.created_at)}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="text-xs text-gray-400">#{order.id}</span>
          <span>•</span>
          <span>{order.order_data.items?.length || 0} товаров</span>
        </div>
        {order.order_data.department && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-900 font-medium">
              {order.order_data.department}
            </span>
          </>
        )}
      </div>
    </Card>
  );
}

// Delivered order variant with green styling
export function DeliveredOrderCard({
  order,
  onClick,
  formatDate,
}: Omit<OrderCardProps, "onDelete">) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">#{order.id}</span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
            ✓ Доставлен
          </span>
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
        onClick={onClick}
        className="w-full bg-white hover:bg-gray-50 border-2 border-green-200 text-green-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
      >
        Просмотр деталей
      </button>
    </div>
  );
}
