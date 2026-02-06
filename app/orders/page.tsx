"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Order, Supplier, UserOrderPermissions } from "@/types";

type ViewMode = "review" | "dispatch";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [permissions, setPermissions] = useState<UserOrderPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [itemInputs, setItemInputs] = useState<Record<string, { quantity: string; price: string }>>({});
  const [updating, setUpdating] = useState<number | null>(null);

  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isManager = userRole === "manager" || userRole === "admin";

  const canSendOrders = isManager || (permissions?.canSendOrders ?? false);
  const canReceiveSupplies = isManager || (permissions?.canReceiveSupplies ?? false);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    setLoading(true);
    try {
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

  // --- REVIEW VIEW: Group by Department ---
  const reviewItems = useMemo(() => {
    const departments = new Map<string, { name: string; items: any[]; orderIds: Set<number> }>();

    orders.forEach(order => {
      if (order.status !== 'pending') return;

      const deptName = order.order_data.department || "Общее";

      if (!departments.has(deptName)) {
        departments.set(deptName, { name: deptName, items: [], orderIds: new Set() });
      }

      const deptGroup = departments.get(deptName)!;
      deptGroup.orderIds.add(order.id);

      (order.order_data.items || []).forEach((item: any, itemIdx: number) => {
        deptGroup.items.push({
          ...item,
          _orderId: order.id,
          _itemIdx: itemIdx
        });
      });
    });

    return Array.from(departments.values());
  }, [orders]);

  // --- DISPATCH VIEW: Group by Supplier ---
  const dispatchGroups = useMemo(() => {
    const toSend = new Map<string, { items: any[]; orderIds: Set<number> }>();
    const expecting = new Map<string, { items: any[]; orderIds: Set<number> }>();

    orders.forEach(order => {
      if (!['pending', 'sent'].includes(order.status)) return;

      (order.order_data.items || []).forEach((item: any, itemIdx: number) => {
        const supplier = item.supplier || "Без поставщика";
        const itemWithMeta = { ...item, _orderId: order.id, _itemIdx: itemIdx };

        if (order.status === 'pending') {
          if (!toSend.has(supplier)) toSend.set(supplier, { items: [], orderIds: new Set() });
          toSend.get(supplier)!.items.push(itemWithMeta);
          toSend.get(supplier)!.orderIds.add(order.id);
        } else if (order.status === 'sent') {
          if (!expecting.has(supplier)) expecting.set(supplier, { items: [], orderIds: new Set() });
          expecting.get(supplier)!.items.push(itemWithMeta);
          expecting.get(supplier)!.orderIds.add(order.id);
        }
      });
    });

    return {
      toSend: Array.from(toSend.entries()),
      expecting: Array.from(expecting.entries())
    };
  }, [orders]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const sentCount = orders.filter(o => o.status === 'sent').length;

  // Send to WhatsApp and mark orders as sent
  const sendToWhatsApp = async (supplierName: string, items: any[]) => {
    const supplier = suppliers.find((s) => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`Телефон не найден для "${supplierName}"`);
      // Still update status even without phone
    } else {
      const restaurantName = session?.user?.restaurantId || "Ресторан";
      const dateStr = new Date().toLocaleDateString("ru-RU");

      let message = `Заказ от ${restaurantName}\n`;
      message += `Дата: ${dateStr}\n\n`;
      message += `Товары:\n`;

      items.slice(0, 20).forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || "шт"}\n`;
      });

      if (items.length > 20) {
        message += `\n...и еще ${items.length - 20} позиций`;
      }

      message += `\nВсего: ${items.length} позиций`;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl.length > 2000 ? `https://wa.me/${cleanPhone}` : whatsappUrl, "_blank");
    }

    // Update status to 'sent' for all affected orders
    const orderIds = [...new Set(items.map(item => item._orderId))];
    try {
      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "sent",
      });

      if (response.success) {
        loadData();
        toast.success("Заказы отмечены как отправленные");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleConfirmDelivery = async (supplierName: string, items: any[]) => {
    const orderIds = [...new Set(items.map(item => item._orderId))];
    setUpdating(orderIds[0]);

    try {
      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "delivered",
      });

      if (response.success) {
        loadData();
        toast.success("Поставка принята!");
      } else {
        toast.error("Ошибка при подтверждении");
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("Ошибка при подтверждении доставки");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={isStaff ? "Мои заказы" : "📦 Управление заказами"}
        variant="purple"
      />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Toggle: Review / Dispatch */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("review")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "review" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  1. Проверка ({reviewItems.length})
                </button>
                <button
                  onClick={() => setViewMode("dispatch")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "dispatch" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  2. Отправка ({dispatchGroups.toSend.length})
                </button>
              </div>

              {viewMode === "review" && reviewItems.length > 0 && (
                <button
                  onClick={() => setViewMode("dispatch")}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  К поставщикам →
                </button>
              )}
            </div>

            {/* --- REVIEW VIEW --- */}
            {viewMode === "review" && (
              <div className="space-y-6">
                {reviewItems.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Нет активных заявок
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Все заявки проверены или отсутствуют
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Перейти к отделам
                    </Link>
                  </div>
                ) : (
                  reviewItems.map(dept => {
                    const isExpanded = expandedDept === dept.name;
                    return (
                      <div key={dept.name} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div
                          onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                          className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏪</span>
                            <div>
                              <h3 className="font-bold text-lg">{dept.name}</h3>
                              <p className="text-sm text-gray-500">{dept.items.length} позиций</p>
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

                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            {dept.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-500">{item.supplier || "Нет поставщика"}</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-gray-900">
                                    {item.quantity} {item.unit || "шт"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* --- DISPATCH VIEW --- */}
            {viewMode === "dispatch" && (
              <div className="space-y-8">
                {/* To Send Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📤 К отправке
                    <span className="text-sm font-normal text-gray-500">
                      ({dispatchGroups.toSend.length} поставщиков)
                    </span>
                  </h3>

                  {dispatchGroups.toSend.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-xl border">
                      <p className="text-gray-500">Нет заказов к отправке</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dispatchGroups.toSend.map(([supplier, group]) => {
                        const isExpanded = expandedSupplier === supplier;
                        return (
                          <div key={supplier} className="bg-white border-2 border-blue-100 rounded-xl shadow-sm overflow-hidden hover:border-blue-300 transition-all">
                            <div
                              onClick={() => setExpandedSupplier(isExpanded ? null : supplier)}
                              className="p-4 cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">📦</span>
                                  <div>
                                    <h4 className="font-bold text-lg">{supplier}</h4>
                                    <p className="text-sm text-gray-500">{group.items.length} товаров</p>
                                  </div>
                                </div>
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                  Ожидает
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendToWhatsApp(supplier, group.items);
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium transition-colors"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                WhatsApp & Отметить
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="border-t bg-gray-50 p-4 space-y-2">
                                {group.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border">
                                    <span className="text-gray-900">{item.name}</span>
                                    <span className="font-medium">{item.quantity} {item.unit || "шт"}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expecting Delivery Section */}
                {dispatchGroups.expecting.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      🚚 Ожидаем доставку
                      <span className="text-sm font-normal text-gray-500">
                        ({dispatchGroups.expecting.length} поставщиков)
                      </span>
                    </h3>

                    <div className="space-y-3">
                      {dispatchGroups.expecting.map(([supplier, group]) => (
                        <div key={supplier} className="bg-white border-2 border-green-100 rounded-xl shadow-sm p-4 hover:border-green-300 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🚚</span>
                              <div>
                                <h4 className="font-bold text-lg">{supplier}</h4>
                                <p className="text-sm text-gray-500">{group.items.length} товаров</p>
                              </div>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              Отправлено
                            </span>
                          </div>

                          <button
                            onClick={() => handleConfirmDelivery(supplier, group.items)}
                            disabled={updating !== null}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            ✓ Принять поставку
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {dispatchGroups.toSend.length === 0 && dispatchGroups.expecting.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Нет активных заказов
                    </h3>
                    <p className="text-gray-500">
                      Заказы появятся после проверки заявок
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
