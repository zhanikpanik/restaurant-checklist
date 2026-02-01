"use client";

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
  onReload,
}: OrdersTabProps) {
  const toast = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");

  // Filter orders by status
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
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

  const groupPendingOrdersBySupplier = () => {
    const supplierGroups = new Map<
      string,
      {
        items: any[];
        orders: Order[];
        totalItems: number;
      }
    >();

    const pendingOrders = orders.filter((order) => order.status === "pending");

    pendingOrders.forEach((order) => {
      const items = order.order_data.items || [];
      items.forEach((item) => {
        const supplierName = item.supplier || "Без поставщика";

        if (!supplierGroups.has(supplierName)) {
          supplierGroups.set(supplierName, {
            items: [],
            orders: [],
            totalItems: 0,
          });
        }

        const group = supplierGroups.get(supplierName)!;

        if (!group.orders.find((o) => o.id === order.id)) {
          group.orders.push(order);
        }

        group.items.push({
          ...item,
          orderId: order.id,
          orderDate: order.created_at,
          department: order.order_data.department,
        });
        group.totalItems += 1;
      });
    });

    return supplierGroups;
  };

  const sendToWhatsApp = (supplierName: string, items: any[], orderDate: Date) => {
    const supplier = suppliers.find((s) => s.name === supplierName);

    if (!supplier?.phone) {
      toast.warning(`Номер телефона для поставщика "${supplierName}" не найден`);
      return;
    }

    const cleanPhone = supplier.phone.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.warning(`Неверный формат номера телефона для поставщика "${supplierName}"`);
      return;
    }

    const dateStr = new Date(orderDate).toLocaleDateString("ru-RU");

    let message = `Заказ от ${restaurantName}\n`;
    message += `Дата: ${dateStr}\n\n`;
    message += `Товары:\n`;

    const itemsToShow = items.slice(0, 20);
    itemsToShow.forEach((item, index) => {
      message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || "шт"}\n`;
    });

    if (items.length > 20) {
      message += `\n...и еще ${items.length - 20} позиций`;
    }

    message += `\nВсего: ${items.length} позиций`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (whatsappUrl.length > 2000) {
      const fallbackUrl = `https://wa.me/${cleanPhone}`;
      window.open(fallbackUrl, "_blank");
      toast.info("Сообщение слишком длинное. WhatsApp открыт без текста.");
    } else {
      window.open(whatsappUrl, "_blank");
      toast.success("WhatsApp открыт");
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* By Supplier Section (only for pending filter or all with pending orders) */}
      {(statusFilter === "all" || statusFilter === "pending") &&
        statusCounts.pending > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg md:text-xl font-semibold">По поставщикам</h2>
              <span className="text-sm text-gray-500">(активные заказы)</span>
            </div>
            
            {/* Mobile Card View - Supplier Groups */}
            <div className="space-y-3">
              {Array.from(groupPendingOrdersBySupplier()).map(([supplierName, group]) => {
                const isExpanded = expandedSupplier === supplierName;
                return (
                  <div
                    key={supplierName}
                    className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm"
                  >
                    {/* Supplier Header */}
                    <div
                      onClick={() => setExpandedSupplier(isExpanded ? null : supplierName)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📦</span>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{supplierName}</h3>
                            <p className="text-xs text-gray-500">
                              {group.orders.length}{" "}
                              {group.orders.length === 1
                                ? "заказ"
                                : group.orders.length < 5
                                ? "заказа"
                                : "заказов"}
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Товаров</p>
                          <p className="text-sm font-medium text-gray-900">{group.totalItems} шт</p>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendToWhatsApp(supplierName, group.items, group.orders[0].created_at);
                          }}
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          WhatsApp
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Items View */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="space-y-3">
                          {group.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  {item.category && (
                                    <p className="text-xs text-gray-500">{item.category}</p>
                                  )}
                                </div>
                                <div className="text-right ml-3">
                                  <p className="font-semibold text-gray-900">
                                    {item.quantity} {item.unit || "шт"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>#{item.orderId}</span>
                                {item.department && (
                                  <>
                                    <span>•</span>
                                    <span>{item.department}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Orders List */}
      <div className={statusFilter === "pending" || (statusFilter === "all" && statusCounts.pending > 0) ? "border-t pt-6" : ""}>
        <h2 className="text-lg md:text-xl font-semibold mb-4">
          {statusFilter === "all" ? "Все заказы" : `Заказы: ${getStatusLabel(statusFilter)}`}
        </h2>
        
        {filteredOrders.length === 0 ? (
          <EmptyStateIllustrated
            type="orders"
            title={statusFilter === "all" ? "Нет заказов" : `Нет заказов со статусом "${getStatusLabel(statusFilter)}"`}
            description="Заказы появятся здесь после создания"
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <span className="text-gray-900 font-medium">{order.order_data.department}</span>
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
