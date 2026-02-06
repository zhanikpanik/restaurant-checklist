"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { Order, Supplier, UserOrderPermissions } from "@/types";

type TabType = "active" | "history";
type ScreenType = "list" | "dispatch";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [permissions, setPermissions] = useState<UserOrderPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [screen, setScreen] = useState<ScreenType>("list");
  const [updating, setUpdating] = useState<boolean>(false);
  
  // Local quantity adjustments: { `${orderId}-${itemIdx}`: adjustedQuantity }
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});

  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isManager = userRole === "manager" || userRole === "admin";

  const canSendOrders = isManager || (permissions?.canSendOrders ?? false);

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

  // Get all pending items as flat list
  const pendingItems = useMemo(() => {
    const items: any[] = [];
    orders.forEach(order => {
      if (order.status !== 'pending') return;
      const dept = order.order_data.department || "Общее";
      (order.order_data.items || []).forEach((item: any, idx: number) => {
        const key = `${order.id}-${idx}`;
        items.push({
          ...item,
          _key: key,
          _orderId: order.id,
          _itemIdx: idx,
          _department: dept,
          _quantity: adjustedQuantities[key] ?? item.quantity,
        });
      });
    });
    return items;
  }, [orders, adjustedQuantities]);

  // Get sent items (in transit)
  const sentItems = useMemo(() => {
    const items: any[] = [];
    orders.forEach(order => {
      if (order.status !== 'sent') return;
      (order.order_data.items || []).forEach((item: any, idx: number) => {
        items.push({
          ...item,
          _orderId: order.id,
          _itemIdx: idx,
          _department: order.order_data.department || "Общее",
        });
      });
    });
    return items;
  }, [orders]);

  // Get delivered orders for history
  const historyOrders = useMemo(() => {
    return orders
      .filter(o => ['delivered', 'cancelled'].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  // Group pending items by supplier for dispatch screen
  const supplierGroups = useMemo(() => {
    const groups = new Map<string, { items: any[]; orderIds: Set<number> }>();
    
    pendingItems.forEach(item => {
      const supplier = item.supplier || "Без поставщика";
      if (!groups.has(supplier)) {
        groups.set(supplier, { items: [], orderIds: new Set() });
      }
      groups.get(supplier)!.items.push(item);
      groups.get(supplier)!.orderIds.add(item._orderId);
    });
    
    return Array.from(groups.entries());
  }, [pendingItems]);

  // Adjust quantity
  const handleQuantityChange = (key: string, delta: number) => {
    setAdjustedQuantities(prev => {
      const item = pendingItems.find(i => i._key === key);
      if (!item) return prev;
      
      const current = prev[key] ?? item.quantity;
      const newQty = Math.max(0, current + delta);
      
      return { ...prev, [key]: newQty };
    });
  };

  // Remove item (set quantity to 0)
  const handleRemoveItem = (key: string) => {
    setAdjustedQuantities(prev => ({ ...prev, [key]: 0 }));
  };

  // Send to WhatsApp
  const sendToWhatsApp = async (supplierName: string, items: any[]) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");

    // Filter out zero-quantity items
    const itemsToSend = items.filter(i => i._quantity > 0);
    
    if (itemsToSend.length === 0) {
      toast.error("Нет товаров для отправки");
      return;
    }

    if (cleanPhone && cleanPhone.length >= 10) {
      const restaurantName = session?.user?.restaurantId || "Ресторан";
      const dateStr = new Date().toLocaleDateString("ru-RU");

      let message = `📦 Заказ от ${restaurantName}\n📅 ${dateStr}\n\n`;
      
      itemsToSend.slice(0, 20).forEach((item, index) => {
        message += `${index + 1}. ${item.name} — ${item._quantity} ${item.unit || "шт"}\n`;
      });

      if (itemsToSend.length > 20) {
        message += `\n...и еще ${itemsToSend.length - 20} позиций`;
      }
      message += `\n━━━━━━━━━━━━\nИтого: ${itemsToSend.length} позиций`;

      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url.length > 2000 ? `https://wa.me/${cleanPhone}` : url, "_blank");
    } else {
      toast.warning(`Телефон не найден для "${supplierName}"`);
    }

    // Update order status
    const orderIds = [...new Set(itemsToSend.map(i => i._orderId))];
    try {
      await api.post("/api/orders/bulk-update", { ids: orderIds, status: "sent" });
      toast.success("✓ Отправлено");
      loadData();
      setAdjustedQuantities({});
    } catch (error) {
      console.error(error);
    }
  };

  // Confirm delivery
  const handleConfirmDelivery = async (orderIds: number[]) => {
    setUpdating(true);
    try {
      await api.post("/api/orders/bulk-update", { ids: orderIds, status: "delivered" });
      toast.success("✓ Поставка принята");
      loadData();
    } catch (error) {
      toast.error("Ошибка");
    } finally {
      setUpdating(false);
    }
  };

  // Count active items (excluding zero-quantity)
  const activeItemCount = pendingItems.filter(i => i._quantity > 0).length;

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    
    if (diffDays === 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // === DISPATCH SCREEN ===
  if (screen === "dispatch") {
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button 
              onClick={() => setScreen("list")}
              className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Отправка поставщикам</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          {supplierGroups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400">Нет товаров для отправки</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplierGroups.map(([supplier, group]) => {
                const validItems = group.items.filter(i => i._quantity > 0);
                if (validItems.length === 0) return null;
                
                return (
                  <div key={supplier} className="bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-lg">{supplier}</h3>
                          <p className="text-slate-400 text-sm">{validItems.length} товаров</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {validItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-2 border-b border-slate-700 last:border-0">
                          <span className="text-slate-300">{item.name}</span>
                          <span className="text-white font-medium">{item._quantity} {item.unit || "шт"}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 bg-slate-700/50">
                      <button
                        onClick={() => sendToWhatsApp(supplier, group.items)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // === MAIN LIST SCREEN ===
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-white">Заказы</h1>
            </div>
            <button 
              onClick={loadData}
              className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-700/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Заявки
              {(pendingItems.length + sentItems.length) > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "active" ? "bg-slate-200" : "bg-slate-600"
                }`}>
                  {pendingItems.length + sentItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              История
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* === ACTIVE TAB === */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-400 mb-3 px-1">
                  К отправке · {activeItemCount} позиций
                </h2>
                <div className="space-y-2">
                  {pendingItems.map(item => {
                    if (item._quantity === 0) return null;
                    return (
                      <div 
                        key={item._key}
                        className="bg-slate-800 rounded-xl p-4 flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{item.name}</p>
                          <p className="text-sm text-slate-400">
                            {item.supplier || "—"} · {item._department}
                          </p>
                        </div>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item._key, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          >
                            −
                          </button>
                          <span className="w-12 text-center text-white font-medium">
                            {item._quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item._key, 1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveItem(item._key)}
                          className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sent Items (In Transit) */}
            {sentItems.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-400 mb-3 px-1">
                  🚚 В пути · {sentItems.length} позиций
                </h2>
                <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
                  {sentItems.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-sm text-slate-400">{item.supplier || "—"}</p>
                      </div>
                      <span className="text-white">{item.quantity} {item.unit || "шт"}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    const orderIds = [...new Set(sentItems.map(i => i._orderId))];
                    handleConfirmDelivery(orderIds);
                  }}
                  disabled={updating}
                  className="w-full mt-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  ✓ Принять все поставки
                </button>
              </div>
            )}

            {/* Empty state */}
            {pendingItems.length === 0 && sentItems.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-white mb-2">Нет активных заказов</h3>
                <p className="text-slate-400 mb-6">Заявки появятся здесь после создания</p>
                <Link
                  href="/"
                  className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Перейти к отделам
                </Link>
              </div>
            )}
          </div>
        )}

        {/* === HISTORY TAB === */}
        {activeTab === "history" && (
          <div>
            {historyOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-white mb-2">История пуста</h3>
                <p className="text-slate-400">Завершённые заказы появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyOrders.map(order => (
                  <div key={order.id} className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">#{order.id}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{order.order_data.department}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'delivered' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.status === 'delivered' ? 'Доставлено' : 'Отменено'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {formatDate(order.created_at)} · {order.order_data.items?.length || 0} позиций
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {order.order_data.items?.slice(0, 3).map((i: any) => i.name).join(", ")}
                      {(order.order_data.items?.length || 0) > 3 && "..."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      {activeTab === "active" && activeItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setScreen("dispatch")}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-2xl font-medium text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
            >
              Отправить
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                {activeItemCount}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
