
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { api } from "@/lib/api-client";
import type { Order, Supplier, Product } from "@/types";

type OrderStatusFilter = "all" | "pending" | "sent" | "delivered" | "cancelled";

interface OrdersTabProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  suppliers: Supplier[];
  products: Product[];
  loading: boolean;
  restaurantName: string;
  onReload: () => void;
}

export function OrdersTab({
  orders,
  setOrders,
  suppliers,
  products,
  loading,
  restaurantName,
  onReload: _onReload,
}: OrdersTabProps) {
  const toast = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Filter orders by status and date
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) return false;

    // Date filter
    if (dateRange.start) {
      const orderDate = new Date(order.created_at);
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      if (orderDate < startDate) return false;
    }
    
    if (dateRange.end) {
      const orderDate = new Date(order.created_at);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (orderDate > endDate) return false;
    }

    return true;
  });

  // Pagination
  const pagination = usePagination(filteredOrders, { initialPageSize: 10 });

  // Count orders by status for filter badges
  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    sent: orders.filter((o) => o.status === "sent").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Удалить этот заказ?")) return;

    try {
      const response = await api.delete(`/api/orders?id=${orderId}`);

      if (response.success) {
        setOrders(orders.filter((o) => o.id !== orderId));
        toast.success("Заказ удален");
      } else {
        toast.error(response.error || "Ошибка при удалении заказа");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Ошибка при удалении заказа");
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await api.patch("/api/orders", { id: orderId, status: newStatus });

      if (response.success) {
        setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o)));
        toast.success(`Статус изменен на "${getStatusLabel(newStatus)}"`);
      } else {
        toast.error(response.error || "Ошибка при изменении статуса");
      }
    } catch (error) {
      toast.error("Ошибка при изменении статуса");
    }
  };

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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Ожидает",
      sent: "Отправлен",
      delivered: "Доставлен",
      cancelled: "Отменен",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Ожидает", variant: "warning" as const },
      sent: { label: "Отправлен", variant: "info" as const },
      delivered: { label: "Доставлен", variant: "success" as const },
      cancelled: { label: "Отменен", variant: "danger" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Skeleton loader for orders
  const OrdersSkeleton = () => (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="5rem" height="2.5rem" variant="rectangular" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  if (loading) {
    return <OrdersSkeleton />;
  }

  return (
    <div className="p-4 md:p-6">
      {/* Filters Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "sent", "delivered", "cancelled"] as OrderStatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status === "all"
                  ? "Все"
                  : status === "pending"
                  ? "Ожидает"
                  : status === "sent"
                  ? "Отправлено"
                  : status === "delivered"
                  ? "Доставлено"
                  : "Отменено"}
                {statusCounts[status] > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      statusFilter === status ? "bg-white/20" : "bg-gray-200"
                    }`}
                  >
                    {statusCounts[status]}
                  </span>
                )}
              </button>
            )
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="px-2 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            placeholder="С"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="px-2 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            placeholder="По"
          />
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: "", end: "" })}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Сбросить фильтр"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div>
        {filteredOrders.length === 0 ? (
          <EmptyStateIllustrated
            type="orders"
            title={
              statusFilter === "all"
                ? "Нет заказов"
                : `Нет заказов со статусом "${getStatusLabel(statusFilter)}"`
            }
            description="Заказы от отделов появятся здесь"
          />
        ) : (
          <div className="space-y-3">
            {pagination.paginatedItems.map((order) => (
              <div
                key={order.id}
                onClick={() => handleViewOrder(order)}
                className={`border rounded-xl p-4 transition-all shadow-sm cursor-pointer ${
                  order.status === "delivered"
                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                    : order.status === "cancelled"
                    ? "bg-gray-50 border-gray-200 hover:border-gray-300 opacity-75"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">
                      {formatNaturalDate(order.created_at)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === "pending" && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(order.id, "delivered");
                        }}
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id);
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </div>
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
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            onGoToPage={pagination.goToPage}
            onNextPage={pagination.nextPage}
            onPrevPage={pagination.prevPage}
            onPageSizeChange={pagination.setPageSize}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }}
        onOrderUpdate={(updatedOrder) => {
          setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
          setSelectedOrder(updatedOrder);
        }}
        suppliers={suppliers}
        products={products}
        restaurantName={restaurantName}
      />
    </div>
  );
}
