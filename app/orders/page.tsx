"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Order, Supplier, UserOrderPermissions } from "@/types";

type OrderStatusFilter = "all" | "pending" | "sent" | "delivered" | "cancelled";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [permissions, setPermissions] = useState<UserOrderPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [itemInputs, setItemInputs] = useState<Record<string, { quantity: string; price: string }>>({});
  const [updating, setUpdating] = useState<number | null>(null);

  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isManager = userRole === "manager" || userRole === "admin";

  // Permission-based access (replaces old role-based checks)
  const canSendOrders = isManager || (permissions?.canSendOrders ?? false);
  const canReceiveSupplies = isManager || (permissions?.canReceiveSupplies ?? false);
  const canManageOrders = canSendOrders || canReceiveSupplies;

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load orders, suppliers, and permissions in parallel
      const [ordersRes, suppliersRes, permissionsRes] = await Promise.all([
        api.get<Order[]>(isStaff ? "/api/orders?my=true&limit=50" : "/api/orders"),
        api.get<Supplier[]>("/api/suppliers"),
        api.get<UserOrderPermissions>("/api/user-sections?permissions=true"),
      ]);

      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
      }
      if (suppliersRes.success && Array.isArray(suppliersRes.data)) {
        setSuppliers(suppliersRes.data);
      }
      if (permissionsRes.success && permissionsRes.data) {
        setPermissions(permissionsRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group pending orders by supplier for bulk WhatsApp sending
  const pendingOrdersBySupplier = useMemo(() => {
    const supplierGroups = new Map<string, { items: any[]; orders: Order[]; totalItems: number }>();
    const pendingOrders = orders.filter((order) => order.status === "pending");

    pendingOrders.forEach((order) => {
      const items = order.order_data.items || [];
      items.forEach((item: any) => {
        const supplierName = item.supplier || "Без поставщика";

        if (!supplierGroups.has(supplierName)) {
          supplierGroups.set(supplierName, { items: [], orders: [], totalItems: 0 });
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
  }, [orders]);

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

  // Send to WhatsApp and mark orders as sent
  const sendToWhatsApp = async (supplierName: string, items: any[], ordersToSend: Order[]) => {
    const supplier = suppliers.find((s) => s.name === supplierName);

    if (!supplier?.phone) {
      toast.error(`Номер телефона для поставщика "${supplierName}" не найден`);
      return;
    }

    const cleanPhone = supplier.phone.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`Неверный формат номера телефона для поставщика "${supplierName}"`);
      return;
    }

    // Get restaurant name from session
    const restaurantName = session?.user?.restaurantId || "Ресторан";

    // Use the date of the newest order for the message header
    const latestDate = new Date(Math.max(...ordersToSend.map(o => new Date(o.created_at).getTime())));
    const dateStr = latestDate.toLocaleDateString("ru-RU");

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

    // Open WhatsApp
    if (whatsappUrl.length > 2000) {
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
      toast.warning("Сообщение слишком длинное. WhatsApp открыт без текста.");
    } else {
      window.open(whatsappUrl, "_blank");
    }

    // Update status to 'sent' for all orders
    const orderIds = ordersToSend.map((o) => o.id);
    try {
      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "sent",
      });

      if (response.success) {
        loadData();
        toast.success("Заказы отмечены как отправленные");
      } else {
        console.error("Failed to update status:", response.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    setUpdating(order.id);
    try {
      const response = await api.patch("/api/orders", {
        id: order.id,
        status: newStatus,
      });

      if (response.success) {
        loadData();
      } else {
        toast.error("Ошибка: " + response.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Ошибка обновления статуса");
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
      const updateResponse = await api.patch("/api/orders", {
        id: order.id,
        status: "delivered",
        order_data: {
          ...order.order_data,
          items: confirmedItems,
          deliveredAt: new Date().toISOString(),
        },
      });

      if (!updateResponse.success) {
        toast.error("Ошибка при обновлении заказа: " + updateResponse.error);
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

            const posterResponse = await api.post("/api/poster/supply-order", posterPayload);

            if (!posterResponse.success) {
              posterSuccess = false;
              posterError = posterResponse.error || "Unknown error";
            }
          } catch (err) {
            posterSuccess = false;
            posterError = err instanceof Error ? err.message : "Unknown error";
          }
        }

        if (posterSuccess) {
          toast.success("Заказ подтвержден и отправлен в Poster!");
        } else {
          toast.warning(`Заказ подтвержден. ${posterError ? "Ошибка Poster: " + posterError : ""}`);
        }
      } else {
        toast.success("Заказ подтвержден!");
      }

      // Clear inputs and reload
      setItemInputs({});
      setExpandedOrder(null);
      loadData();
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("Ошибка при подтверждении доставки");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={isStaff ? "Мои заказы" : "Заказы"}
        variant="purple"
        rightContent={
          canManageOrders ? (
            <span className="text-sm opacity-75">
              {canSendOrders && canReceiveSupplies ? "Полный доступ" : canSendOrders ? "Отправка" : "Приёмка"}
            </span>
          ) : undefined
        }
      />

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

      {/* Orders Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        ) : (
          <>
            {/* By Supplier Section (only for pending filter and users who can send orders) */}
            {canSendOrders && (statusFilter === "all" || statusFilter === "pending") && statusCounts.pending > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">По поставщикам</h2>
                  <span className="text-sm text-gray-500">(отправка в WhatsApp)</span>
                </div>
                
                <div className="space-y-3">
                  {Array.from(pendingOrdersBySupplier).map(([supplierName, group]) => {
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
                                  {group.orders.length} {group.orders.length === 1 ? "заказ" : group.orders.length < 5 ? "заказа" : "заказов"}
                                </p>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500">Товаров</p>
                              <p className="text-sm font-medium text-gray-900">{group.totalItems} шт</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendToWhatsApp(supplierName, group.items, group.orders);
                              }}
                              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                              WhatsApp
                            </button>
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
                                      {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
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

            {/* Divider if there are both supplier groups and orders list */}
            {canSendOrders && (statusFilter === "all" || statusFilter === "pending") && statusCounts.pending > 0 && filteredOrders.length > 0 && (
              <div className="border-t border-gray-200 my-6" />
            )}

            {/* Orders List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {statusFilter === "all" ? "Все заказы" : `Заказы: ${getStatusLabel(statusFilter)}`}
              </h2>

              {filteredOrders.length === 0 ? (
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
                    const isUpdating = updating === order.id;

                    // Show inputs for sent orders if user can receive supplies
                    const showInputs = canReceiveSupplies && isSent;

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

                          {/* Quick action button for pending orders - Send via WhatsApp */}
                          {canSendOrders && isPending && !isExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Group items by supplier for this single order
                                const supplierGroups = new Map<string, any[]>();
                                items.forEach((item: any) => {
                                  const supplierName = item.supplier || "Без поставщика";
                                  if (!supplierGroups.has(supplierName)) {
                                    supplierGroups.set(supplierName, []);
                                  }
                                  supplierGroups.get(supplierName)!.push(item);
                                });
                                // Send to first supplier (for single order quick action)
                                const [firstSupplier, firstItems] = Array.from(supplierGroups)[0];
                                sendToWhatsApp(firstSupplier, firstItems, [order]);
                              }}
                              disabled={isUpdating}
                              className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                              Отправить в WhatsApp
                            </button>
                          )}

                          {/* Quick action button for sent orders - Confirm Delivery */}
                          {canReceiveSupplies && isSent && !isExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleOrder(order.id);
                              }}
                              disabled={isUpdating}
                              className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              Подтвердить доставку
                            </button>
                          )}
                        </div>

                        {/* Expanded Order Details */}
                        {isExpanded && (
                          <div className="border-t p-4 bg-gray-50">
                            <div className="space-y-3">
                              {items.map((item: any, idx: number) => {
                                const itemKey = `${order.id}-${item.name}`;
                                const savedInputs = itemInputs[itemKey];
                                const inputs = {
                                  quantity: savedInputs?.quantity ?? "",
                                  price: savedInputs?.price ?? ""
                                };

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
                                      {item.supplier && <span className="text-gray-400 ml-2">• {item.supplier}</span>}
                                    </div>

                                    {/* Show inputs for SENT orders (adjustment during receiving) */}
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
                            {(isPending || isSent) && (
                              <div className="mt-4 space-y-2">
                                {/* Pending order actions */}
                                {isPending && canSendOrders && (
                                  <button
                                    onClick={() => {
                                      const supplierGroups = new Map<string, any[]>();
                                      items.forEach((item: any) => {
                                        const supplierName = item.supplier || "Без поставщика";
                                        if (!supplierGroups.has(supplierName)) {
                                          supplierGroups.set(supplierName, []);
                                        }
                                        supplierGroups.get(supplierName)!.push(item);
                                      });
                                      const [firstSupplier, firstItems] = Array.from(supplierGroups)[0];
                                      sendToWhatsApp(firstSupplier, firstItems, [order]);
                                    }}
                                    disabled={isUpdating}
                                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    {isUpdating ? "Обновление..." : "Отправить в WhatsApp"}
                                  </button>
                                )}
                                
                                {/* Sent order actions - Confirm Delivery */}
                                {isSent && canReceiveSupplies && (
                                  <button
                                    onClick={() => handleConfirmDelivery(order)}
                                    disabled={isUpdating}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                  >
                                    {isUpdating ? "Обновление..." : "Подтвердить доставку"}
                                  </button>
                                )}
                                
                                {/* Cancel button for managers */}
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
