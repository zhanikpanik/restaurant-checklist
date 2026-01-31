"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { Order, Supplier, Product } from "@/types";

interface OrdersTabProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  suppliers: Supplier[];
  products: Product[];
  loading: boolean;
  restaurantName: string;
}

export function OrdersTab({
  orders,
  setOrders,
  suppliers,
  products,
  loading,
  restaurantName,
}: OrdersTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrderItems, setEditingOrderItems] = useState<any[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Удалить этот заказ?")) return;

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setOrders(orders.filter((o) => o.id !== orderId));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditingOrderItems(order.order_data.items || []);
    setShowOrderModal(true);
  };

  const handleRemoveItemFromOrder = (index: number) => {
    setEditingOrderItems(editingOrderItems.filter((_, i) => i !== index));
  };

  const handleSaveOrderChanges = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          order_data: {
            ...selectedOrder.order_data,
            items: editingOrderItems,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOrders(
          orders.map((o) =>
            o.id === selectedOrder.id
              ? { ...o, order_data: { ...o.order_data, items: editingOrderItems } }
              : o
          )
        );
        setSelectedOrder({
          ...selectedOrder,
          order_data: { ...selectedOrder.order_data, items: editingOrderItems },
        });
        alert("Заказ обновлен");
      } else {
        alert("Ошибка при обновлении заказа: " + data.error);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Ошибка при обновлении заказа");
    }
  };

  const groupItemsBySupplier = (items: any[]) => {
    const grouped = new Map<string, any[]>();

    items.forEach((item) => {
      const supplierName = item.supplier || "Без поставщика";
      if (!grouped.has(supplierName)) {
        grouped.set(supplierName, []);
      }
      grouped.get(supplierName)!.push(item);
    });

    return grouped;
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
      alert(`Номер телефона для поставщика "${supplierName}" не найден`);
      return;
    }

    const cleanPhone = supplier.phone.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      alert(`Неверный формат номера телефона для поставщика "${supplierName}"`);
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
      alert("Сообщение слишком длинное. WhatsApp открыт без текста. Скопируйте заказ вручную.");
    } else {
      window.open(whatsappUrl, "_blank");
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

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Загрузка заказов...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* By Supplier Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg md:text-xl font-semibold">
            По поставщикам
          </h2>
          <span className="text-sm text-gray-500">(активные заказы)</span>
        </div>
        {Array.from(groupPendingOrdersBySupplier()).length === 0 ? (
          <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-lg">
            Нет активных заказов
          </p>
        ) : (
          <>
            {/* Mobile Card View - Supplier Groups */}
            <div className="space-y-3 md:hidden">
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
                            <h3 className="text-lg font-bold text-gray-900">
                              {supplierName}
                            </h3>
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
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Товаров</p>
                            <p className="text-sm font-medium text-gray-900">
                              {group.totalItems} шт
                            </p>
                          </div>
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
                          Отправить
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Items View */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="space-y-3">
                          {group.items.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
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

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Отдел</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Товаров</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleViewOrder(order)}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900">#{order.id}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(order.created_at)}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.order_data.department || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.order_data.items?.length || 0} шт
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
                          >
                            <svg
                              className="w-5 h-5"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="border-t pt-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Все заказы</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-lg">Нет заказов</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleViewOrder(order)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all shadow-sm cursor-pointer"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">
                      {formatNaturalDate(order.created_at)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
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
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }}
        title={`Заказ #${selectedOrder?.id || ""}`}
        size="lg"
      >
        {selectedOrder && (
          <div>
            {/* Order Info */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Дата создания</p>
                <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Статус</p>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              {selectedOrder.order_data.department && (
                <div>
                  <p className="text-sm text-gray-500">Отдел</p>
                  <p className="font-medium">{selectedOrder.order_data.department}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Всего товаров</p>
                <p className="font-medium">{selectedOrder.order_data.items?.length || 0}</p>
              </div>
            </div>

            {/* Items grouped by supplier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-base">Товары по поставщикам</h3>
                <Button size="sm" onClick={() => setShowAddProductModal(true)}>
                  + Добавить товар
                </Button>
              </div>
              {Array.from(groupItemsBySupplier(editingOrderItems)).map(
                ([supplierName, items]) => (
                  <div key={supplierName} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                        <span>📦</span>
                        {supplierName}
                      </h4>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() =>
                          sendToWhatsApp(supplierName, items, selectedOrder.created_at)
                        }
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {items.map((item, idx) => {
                        const globalIdx = editingOrderItems.findIndex((i) => i === item);
                        return (
                          <div key={idx} className="flex justify-between items-center py-1.5 border-t">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                              </p>
                              {item.category && (
                                <p className="text-xs text-gray-500">{item.category}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {item.quantity} {item.unit || "шт"}
                              </p>
                              <button
                                onClick={() => handleRemoveItemFromOrder(globalIdx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-600">
                        Всего позиций: <span className="font-semibold">{items.length}</span>
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Save Button */}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveOrderChanges} className="flex-1">
                Сохранить изменения
              </Button>
            </div>

            {selectedOrder.order_data.notes && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-1">Примечания:</p>
                <p className="text-sm text-yellow-700">{selectedOrder.order_data.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Product to Order Modal */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Добавить товар"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Выберите товар</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              onChange={(e) => {
                if (!e.target.value) return;
                const product = products.find((p: any) => p.id === Number(e.target.value));
                if (!product) return;

                setEditingOrderItems([
                  ...editingOrderItems,
                  {
                    name: product.name,
                    quantity: 1,
                    unit: product.unit || "шт",
                    category: (product as any).category_name || "",
                    supplier: (product as any).supplier_name || "",
                    productId: product.id,
                  },
                ]);
                setShowAddProductModal(false);
              }}
            >
              <option value="">-- Выберите товар --</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category_name || "Без категории"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowAddProductModal(false)} className="flex-1">
            Отмена
          </Button>
        </div>
      </Modal>
    </div>
  );
}
