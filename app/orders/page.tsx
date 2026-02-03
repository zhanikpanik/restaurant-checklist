"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Order } from "@/types";

type OrderStatusFilter = "all" | "pending" | "sent" | "delivered" | "cancelled";

// Using 'any' for order items since they come from API with varying shapes
type OrderItemType = {
  name: string;
  quantity: number;
  unit?: string;
  actualQuantity?: number;
  actualPrice?: number;
  poster_id?: string;
  productId?: number;
  supplier_id?: number;
};

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [itemInputs, setItemInputs] = useState<Record<string, { quantity: string; price: string }>>({});
  const [updating, setUpdating] = useState<number | null>(null);

  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isDelivery = userRole === "delivery";
  const isManager = userRole === "manager" || userRole === "admin";
  const canManageOrders = isDelivery || isManager;

  useEffect(() => {
    if (status === "authenticated") {
      loadOrders();
    }
  }, [status]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Staff sees only their orders, others see all
      const url = isStaff ? "/api/orders?my=true&limit=50" : "/api/orders";
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
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
      case "sent": return "bg-blue-100 text-blue-800";
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

  const handleToggleOrder = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleInputChange = (itemKey: string, field: "quantity" | "price", value: string) => {
    setItemInputs((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value,
      },
    }));
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    setUpdating(order.id);
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        loadOrders();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Ошибка обновления статуса");
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmDelivery = async (order: Order) => {
    const items = order.order_data.items || [];
    setUpdating(order.id);

    // Prepare items with actual quantities and prices
    const confirmedItems = items.map((item: any) => {
      const itemKey = `${order.id}-${item.name}`;
      const inputs = itemInputs[itemKey] || {};
      return {
        ...item,
        actualQuantity: inputs.quantity ? parseFloat(inputs.quantity) : item.quantity,
        actualPrice: inputs.price ? parseFloat(inputs.price) : 0,
      };
    });

    try {
      // Update order status to delivered
      const updateResponse = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          status: "delivered",
          order_data: {
            ...order.order_data,
            items: confirmedItems,
            deliveredAt: new Date().toISOString(),
          },
        }),
      });

      const updateData = await updateResponse.json();
      if (!updateData.success) {
        alert("Ошибка при обновлении заказа: " + updateData.error);
        return;
      }

      // Filter only items that exist in Poster
      const posterItems = confirmedItems.filter((item: any) => {
        return item.poster_id || (item.productId && item.productId > 0);
      });

      // Send to Poster if there are Poster items
      if (posterItems.length > 0) {
        const itemsBySupplier = posterItems.reduce((acc: Record<string, any[]>, item: any) => {
          const supplierId = String(item.supplier_id || "1");
          if (!acc[supplierId]) {
            acc[supplierId] = [];
          }
          acc[supplierId].push(item);
          return acc;
        }, {});

        let posterSuccess = true;
        let posterError = "";

        for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
          try {
            const posterPayload = {
              supplier_id: supplierId,
              items: supplierItems.map((item) => ({
                ingredient_id: String(item.poster_id || item.productId),
                quantity: item.actualQuantity || item.quantity,
                price: item.actualPrice || 0,
              })),
            };

            const posterResponse = await fetch("/api/poster/supply-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(posterPayload),
            });

            const posterData = await posterResponse.json();
            if (!posterData.success) {
              posterSuccess = false;
              posterError = posterData.error;
            }
          } catch (err) {
            posterSuccess = false;
            posterError = err instanceof Error ? err.message : "Unknown error";
          }
        }

        if (posterSuccess) {
          alert("Заказ подтвержден и отправлен в Poster!");
        } else {
          alert(`Заказ подтвержден. ${posterError ? "Ошибка Poster: " + posterError : ""}`);
        }
      } else {
        alert("Заказ подтвержден!");
      }

      // Clear inputs and reload
      setItemInputs({});
      setExpandedOrder(null);
      loadOrders();
    } catch (error) {
      console.error("Error confirming delivery:", error);
      alert("Ошибка при подтверждении доставки");
    } finally {
      setUpdating(null);
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

  const getNextStatusAction = (currentStatus: string) => {
    if (currentStatus === "pending") {
      return { status: "sent", label: "Отправить", color: "bg-blue-600 hover:bg-blue-700" };
    }
    if (currentStatus === "sent") {
      return { status: "delivered", label: "Доставлен", color: "bg-green-600 hover:bg-green-700" };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95 mr-3"
          >
            <svg
              className="w-6 h-6 text-white"
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
          <h1 className="text-xl font-semibold">
            {isStaff ? "Мои заказы" : "Заказы"}
          </h1>
          {canManageOrders && (
            <span className="ml-auto text-sm opacity-75">
              {isDelivery ? "Доставка" : "Менеджер"}
            </span>
          )}
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {(["all", "pending", "sent", "delivered", "cancelled"] as const).map((filterStatus) => (
              <button
                key={filterStatus}
                onClick={() => setStatusFilter(filterStatus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filterStatus
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filterStatus === "all" ? "Все" : getStatusLabel(filterStatus)}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === filterStatus ? "bg-purple-200" : "bg-gray-200"
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
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
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Перейти к отделам
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const items = order.order_data.items || [];
              const isExpanded = expandedOrder === order.id;
              const isPending = order.status === "pending";
              const isSent = order.status === "sent";
              const nextAction = getNextStatusAction(order.status);
              const isUpdating = updating === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Order Header */}
                  <div
                    onClick={() => handleToggleOrder(order.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
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

                    <div className="text-sm text-gray-500 mb-2">
                      {formatDate(order.created_at)}
                      <span className="mx-2">•</span>
                      {items.length} товаров
                    </div>

                    {/* Items preview */}
                    <div className="text-sm text-gray-500 truncate">
                      {items.slice(0, 3).map((item: any) => item.name).join(", ")}
                      {items.length > 3 && "..."}
                    </div>

                    {/* Quick action button (not expanded) */}
                    {canManageOrders && nextAction && !isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (nextAction.status === "delivered" && isDelivery) {
                            handleToggleOrder(order.id);
                          } else {
                            handleUpdateStatus(order, nextAction.status);
                          }
                        }}
                        disabled={isUpdating}
                        className={`mt-3 w-full ${nextAction.color} text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
                      >
                        {isUpdating ? (
                          <span className="inline-flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Обновление...
                          </span>
                        ) : (
                          nextAction.label
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="space-y-3">
                        {items.map((item: any, idx: number) => {
                          const itemKey = `${order.id}-${item.name}`;
                          const inputs = itemInputs[itemKey] || { quantity: "", price: "" };
                          const showInputs = canManageOrders && isPending;

                          return (
                            <div
                              key={idx}
                              className="bg-white p-3 rounded-lg border"
                            >
                              <div className="font-medium text-gray-900 mb-1">
                                {item.name}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                Заказано: {item.quantity} {item.unit}
                              </div>

                              {showInputs && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Факт. кол-во
                                    </label>
                                    <input
                                      type="number"
                                      value={inputs.quantity}
                                      onChange={(e) =>
                                        handleInputChange(itemKey, "quantity", e.target.value)
                                      }
                                      placeholder={String(item.quantity)}
                                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                                      step="0.01"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Цена
                                    </label>
                                    <input
                                      type="number"
                                      value={inputs.price}
                                      onChange={(e) =>
                                        handleInputChange(itemKey, "price", e.target.value)
                                      }
                                      placeholder="0"
                                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                                      step="0.01"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Show delivered info */}
                              {order.status === "delivered" && item.actualQuantity && (
                                <div className="text-sm text-green-600 mt-2">
                                  Получено: {item.actualQuantity} {item.unit}
                                  {item.actualPrice ? ` по ${item.actualPrice} ₸` : ""}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Notes */}
                      {order.order_data.notes && (
                        <div className="mt-3 text-sm text-gray-500 italic bg-white p-3 rounded-lg border">
                          Примечание: {order.order_data.notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {canManageOrders && (isPending || isSent) && (
                        <div className="mt-4 space-y-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order, "sent")}
                                disabled={isUpdating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? "Обновление..." : "Отправить"}
                              </button>
                              <button
                                onClick={() => handleConfirmDelivery(order)}
                                disabled={isUpdating}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? "Обновление..." : "Подтвердить доставку"}
                              </button>
                            </>
                          )}
                          {isSent && (
                            <button
                              onClick={() => handleConfirmDelivery(order)}
                              disabled={isUpdating}
                              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {isUpdating ? "Обновление..." : "Подтвердить доставку"}
                            </button>
                          )}
                          {isManager && (
                            <button
                              onClick={() => handleUpdateStatus(order, "cancelled")}
                              disabled={isUpdating}
                              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Отменить заказ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
