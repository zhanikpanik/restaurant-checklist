"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
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
  const [updating, setUpdating] = useState<boolean>(false);

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

  // Stats
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending');
    const sent = orders.filter(o => o.status === 'sent');
    const delivered = orders.filter(o => o.status === 'delivered');
    
    const pendingItems = pending.reduce((acc, o) => acc + (o.order_data.items?.length || 0), 0);
    const sentItems = sent.reduce((acc, o) => acc + (o.order_data.items?.length || 0), 0);
    
    return {
      pendingOrders: pending.length,
      pendingItems,
      sentOrders: sent.length,
      sentItems,
      deliveredToday: delivered.filter(o => {
        const d = new Date(o.created_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
      suppliersToSend: dispatchGroups.toSend.length,
      suppliersExpecting: dispatchGroups.expecting.length,
    };
  }, [orders, dispatchGroups]);

  // Send to WhatsApp
  const sendToWhatsApp = async (supplierName: string, items: any[]) => {
    const supplier = suppliers.find((s) => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`Телефон не найден для "${supplierName}"`);
    } else {
      const restaurantName = session?.user?.restaurantId || "Ресторан";
      const dateStr = new Date().toLocaleDateString("ru-RU");

      let message = `📦 Заказ от ${restaurantName}\n`;
      message += `📅 ${dateStr}\n\n`;

      items.slice(0, 20).forEach((item, index) => {
        message += `${index + 1}. ${item.name} — ${item.quantity} ${item.unit || "шт"}\n`;
      });

      if (items.length > 20) {
        message += `\n...и еще ${items.length - 20} позиций`;
      }

      message += `\n━━━━━━━━━━━━━━━\nИтого: ${items.length} позиций`;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl.length > 2000 ? `https://wa.me/${cleanPhone}` : whatsappUrl, "_blank");
    }

    // Update status
    const orderIds = [...new Set(items.map(item => item._orderId))];
    try {
      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "sent",
      });

      if (response.success) {
        loadData();
        toast.success("✓ Отправлено поставщику");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Send all pending to suppliers
  const handleSendAll = async () => {
    if (dispatchGroups.toSend.length === 0) return;
    
    setUpdating(true);
    for (const [supplier, group] of dispatchGroups.toSend) {
      await sendToWhatsApp(supplier, group.items);
      // Small delay between sends
      await new Promise(r => setTimeout(r, 500));
    }
    setUpdating(false);
  };

  const handleConfirmDelivery = async (supplierName: string, items: any[]) => {
    const orderIds = [...new Set(items.map(item => item._orderId))];
    setUpdating(true);

    try {
      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "delivered",
      });

      if (response.success) {
        loadData();
        toast.success("✓ Поставка принята!");
      } else {
        toast.error("Ошибка при подтверждении");
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("Ошибка при подтверждении");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200 text-lg">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Заказы</h1>
                <p className="text-purple-300 text-sm">Управление закупками</p>
              </div>
            </div>
            <button 
              onClick={loadData}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.pendingItems}</p>
            <p className="text-amber-200 text-sm">к проверке</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📤</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.suppliersToSend}</p>
            <p className="text-blue-200 text-sm">поставщиков</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🚚</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.suppliersExpecting}</p>
            <p className="text-green-200 text-sm">в пути</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 mb-6 border border-white/10">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setViewMode("review")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                viewMode === "review"
                  ? "bg-white text-gray-900 shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>📋</span>
              <span>Проверка</span>
              {stats.pendingItems > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  viewMode === "review" ? "bg-amber-100 text-amber-700" : "bg-white/20"
                }`}>
                  {stats.pendingItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("dispatch")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                viewMode === "dispatch"
                  ? "bg-white text-gray-900 shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>📦</span>
              <span>Отправка</span>
              {stats.suppliersToSend > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  viewMode === "dispatch" ? "bg-blue-100 text-blue-700" : "bg-white/20"
                }`}>
                  {stats.suppliersToSend}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/60">Прогресс</span>
            <span className="text-white/60">
              {stats.suppliersExpecting > 0 ? "Ожидаем доставку" : stats.suppliersToSend > 0 ? "Готово к отправке" : "Проверка заявок"}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-green-500 transition-all duration-500"
              style={{ 
                width: `${
                  stats.pendingItems === 0 && stats.suppliersToSend === 0 && stats.suppliersExpecting === 0
                    ? 100
                    : stats.suppliersExpecting > 0
                      ? 66
                      : stats.suppliersToSend > 0
                        ? 33
                        : 10
                }%` 
              }}
            />
          </div>
        </div>

        {/* === REVIEW VIEW === */}
        {viewMode === "review" && (
          <div className="space-y-4">
            {reviewItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Всё проверено!</h3>
                <p className="text-white/60 mb-6">Нет новых заявок для проверки</p>
                
                {stats.suppliersToSend > 0 && (
                  <button
                    onClick={() => setViewMode("dispatch")}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Перейти к отправке →
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Quick action */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setViewMode("dispatch")}
                    className="text-purple-300 hover:text-white text-sm flex items-center gap-1 transition-colors"
                  >
                    К отправке
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {reviewItems.map(dept => {
                  const isExpanded = expandedDept === dept.name;
                  return (
                    <div 
                      key={dept.name} 
                      className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all"
                    >
                      <button
                        onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-xl">🏪</span>
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-white text-lg">{dept.name}</h3>
                            <p className="text-white/60 text-sm">{dept.items.length} позиций</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-amber-500/20 text-amber-300 text-xs font-medium px-3 py-1 rounded-full">
                            На проверке
                          </span>
                          <svg
                            className={`w-5 h-5 text-white/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2">
                          {dept.items.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-3 bg-black/20 rounded-xl"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-white">{item.name}</p>
                                <p className="text-white/50 text-sm">{item.supplier || "—"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-white">
                                  {item.quantity} <span className="text-white/50 font-normal">{item.unit || "шт"}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* === DISPATCH VIEW === */}
        {viewMode === "dispatch" && (
          <div className="space-y-6">
            {/* To Send Section */}
            {dispatchGroups.toSend.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">📤</span>
                    К отправке
                  </h3>
                  {dispatchGroups.toSend.length > 1 && (
                    <button
                      onClick={handleSendAll}
                      disabled={updating}
                      className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {updating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          Отправить всё
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {dispatchGroups.toSend.map(([supplier, group]) => {
                    const isExpanded = expandedSupplier === `send-${supplier}`;
                    return (
                      <div 
                        key={supplier} 
                        className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-blue-500/20 hover:border-blue-500/40 transition-all"
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => setExpandedSupplier(isExpanded ? null : `send-${supplier}`)}
                              className="flex items-center gap-4"
                            >
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-xl">📦</span>
                              </div>
                              <div className="text-left">
                                <h4 className="font-bold text-white text-lg">{supplier}</h4>
                                <p className="text-white/60 text-sm">{group.items.length} товаров</p>
                              </div>
                            </button>
                            <svg
                              onClick={() => setExpandedSupplier(isExpanded ? null : `send-${supplier}`)}
                              className={`w-5 h-5 text-white/50 transition-transform cursor-pointer ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          <button
                            onClick={() => sendToWhatsApp(supplier, group.items)}
                            disabled={updating}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Отправить в WhatsApp
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-2">
                            {group.items.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between p-3 bg-black/20 rounded-xl"
                              >
                                <span className="text-white">{item.name}</span>
                                <span className="text-white font-medium">
                                  {item.quantity} {item.unit || "шт"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expecting Delivery Section */}
            {dispatchGroups.expecting.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">🚚</span>
                  Ожидаем доставку
                </h3>

                <div className="space-y-3">
                  {dispatchGroups.expecting.map(([supplier, group]) => (
                    <div 
                      key={supplier} 
                      className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                            <span className="text-xl">🚚</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{supplier}</h4>
                            <p className="text-white/60 text-sm">{group.items.length} товаров</p>
                          </div>
                        </div>
                        <span className="bg-green-500/20 text-green-300 text-xs font-medium px-3 py-1 rounded-full animate-pulse">
                          В пути
                        </span>
                      </div>

                      <button
                        onClick={() => handleConfirmDelivery(supplier, group.items)}
                        disabled={updating}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                      >
                        <span>✓</span>
                        Принять поставку
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {dispatchGroups.toSend.length === 0 && dispatchGroups.expecting.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📭</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Нет активных заказов</h3>
                <p className="text-white/60 mb-6">Все заказы обработаны</p>
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Перейти к отделам
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
