"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { Order, Supplier, UserOrderPermissions } from "@/types";

type TabType = "pending" | "transit" | "history";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [permissions, setPermissions] = useState<UserOrderPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [updating, setUpdating] = useState(false);
  
  // Quantity adjustments for pending items: { `${orderId}-${itemIdx}`: quantity }
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Received quantities for in-transit items: { `${orderId}-${itemIdx}`: quantity }
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  
  // Track which supplier group is being sent
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);

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

  // Get pending items as flat list
  const pendingItems = useMemo(() => {
    const items: any[] = [];
    orders.forEach(order => {
      if (order.status !== 'pending') return;
      (order.order_data.items || []).forEach((item: any, idx: number) => {
        const key = `${order.id}-${idx}`;
        items.push({
          ...item,
          _key: key,
          _orderId: order.id,
          _itemIdx: idx,
          _department: order.order_data.department || "Общее",
          _quantity: pendingQuantities[key] ?? item.quantity,
        });
      });
    });
    return items;
  }, [orders, pendingQuantities]);

  // Get sent items grouped by supplier
  const sentBySupplier = useMemo(() => {
    const groups = new Map<string, { items: any[]; orderIds: Set<number> }>();
    
    orders.forEach(order => {
      if (order.status !== 'sent') return;
      (order.order_data.items || []).forEach((item: any, idx: number) => {
        const supplier = item.supplier || "Без поставщика";
        const key = `${order.id}-${idx}`;
        
        if (!groups.has(supplier)) {
          groups.set(supplier, { items: [], orderIds: new Set() });
        }
        
        groups.get(supplier)!.items.push({
          ...item,
          _key: key,
          _orderId: order.id,
          _itemIdx: idx,
          _orderedQty: item.quantity,
          _receivedQty: receivedQuantities[key] ?? item.quantity,
        });
        groups.get(supplier)!.orderIds.add(order.id);
      });
    });
    
    return Array.from(groups.entries());
  }, [orders, receivedQuantities]);

  // Group pending items by supplier for dispatch
  const pendingBySupplier = useMemo(() => {
    const groups = new Map<string, { items: any[]; orderIds: Set<number> }>();
    
    pendingItems.filter(i => i._quantity > 0).forEach(item => {
      const supplier = item.supplier || "Без поставщика";
      if (!groups.has(supplier)) {
        groups.set(supplier, { items: [], orderIds: new Set() });
      }
      groups.get(supplier)!.items.push(item);
      groups.get(supplier)!.orderIds.add(item._orderId);
    });
    
    return Array.from(groups.entries());
  }, [pendingItems]);

  // History orders
  const historyOrders = useMemo(() => {
    return orders
      .filter(o => ['delivered', 'cancelled'].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  // Determine current focus state
  const hasInTransit = sentBySupplier.length > 0;
  const hasPending = pendingItems.filter(i => i._quantity > 0).length > 0;
  const activeItemCount = pendingItems.filter(i => i._quantity > 0).length;

  // Handlers
  const handlePendingQuantityChange = (key: string, delta: number) => {
    setPendingQuantities(prev => {
      const item = pendingItems.find(i => i._key === key);
      if (!item) return prev;
      const current = prev[key] ?? item.quantity;
      return { ...prev, [key]: Math.max(0, current + delta) };
    });
  };

  const handleReceivedQuantityChange = (key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setReceivedQuantities(prev => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const handleRemoveItem = (key: string) => {
    setPendingQuantities(prev => ({ ...prev, [key]: 0 }));
  };

  // Send to WhatsApp
  const sendToWhatsApp = async (supplierName: string, items: any[]) => {
    setSendingSupplier(supplierName);
    
    const supplier = suppliers.find(s => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");
    const itemsToSend = items.filter(i => i._quantity > 0);
    
    if (itemsToSend.length === 0) {
      toast.error("Нет товаров для отправки");
      setSendingSupplier(null);
      return;
    }

    if (cleanPhone && cleanPhone.length >= 10) {
      const restaurantName = session?.user?.restaurantId || "Ресторан";
      const dateStr = new Date().toLocaleDateString("ru-RU");

      let message = `📦 Заказ от ${restaurantName}\n📅 ${dateStr}\n\n`;
      itemsToSend.forEach((item, idx) => {
        message += `${idx + 1}. ${item.name} — ${item._quantity} ${item.unit || "шт"}\n`;
      });
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
      await loadData();
      setPendingQuantities({});
    } catch (error) {
      console.error(error);
    } finally {
      setSendingSupplier(null);
    }
  };

  // Confirm delivery with adjusted quantities and send to Poster
  const handleConfirmDelivery = async (supplierName: string, items: any[]) => {
    setUpdating(true);
    
    const orderIds = [...new Set(items.map(i => i._orderId))];
    
    try {
      // 1. First, try to send supply to Poster (if items have poster_id)
      const posterItems = items.filter(i => i.poster_id || i.productId);
      
      if (posterItems.length > 0) {
        // Find supplier's poster_id if available
        const supplier = suppliers.find(s => s.name === supplierName);
        const posterSupplierId = (supplier as any)?.poster_supplier_id || 1;
        
        try {
          await api.post("/api/poster/supply-order", {
            supplier_id: posterSupplierId,
            storage_id: 1, // Default storage
            items: posterItems.map(item => ({
              ingredient_id: String(item.poster_id || item.productId),
              quantity: item._receivedQty || item.quantity,
              price: item.price || 0,
            })),
            comment: `Приёмка от ${supplierName}`,
          });
          toast.success("✓ Отправлено в Poster");
        } catch (posterError) {
          console.error("Poster error:", posterError);
          // Don't block the delivery confirmation if Poster fails
          toast.warning("Poster: не удалось создать поставку");
        }
      }
      
      // 2. Update order status to delivered
      const updateResult = await api.post("/api/orders/bulk-update", { ids: orderIds, status: "delivered" });
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update");
      }
      
      toast.success("✓ Поставка принята");
      setReceivedQuantities({});
      await loadData();
    } catch (error) {
      console.error("Delivery error:", error);
      toast.error("Ошибка при приёмке");
    } finally {
      setUpdating(false);
    }
  };

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
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "pending" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              К отправке
              {hasPending && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "pending" ? "bg-amber-100 text-amber-700" : "bg-amber-500/30 text-amber-300"
                }`}>
                  {activeItemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("transit")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "transit" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              В пути
              {hasInTransit && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "transit" ? "bg-green-100 text-green-700" : "bg-green-500/30 text-green-300"
                }`}>
                  {sentBySupplier.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "history" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              История
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* === PENDING TAB - Items to send === */}
        {activeTab === "pending" && (
          <>
            {!hasPending ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📦</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Нет заявок</h3>
                <p className="text-slate-400 mb-6">Новые заявки появятся здесь</p>
                <Link
                  href="/"
                  className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Перейти к отделам
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Items list */}
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
                          <p className="text-sm text-slate-400">{item.supplier || "—"}</p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePendingQuantityChange(item._key, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-white font-medium">
                            {item._quantity}
                          </span>
                          <button
                            onClick={() => handlePendingQuantityChange(item._key, 1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item._key)}
                          className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Supplier breakdown */}
                <div className="space-y-3 mt-6">
                  <h3 className="text-sm font-medium text-slate-400">Поставщики</h3>
                  {pendingBySupplier.map(([supplier, group]) => (
                    <div key={supplier} className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm">
                            📦
                          </div>
                          <div>
                            <p className="font-medium text-white">{supplier}</p>
                            <p className="text-xs text-slate-400">{group.items.length} позиций</p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendToWhatsApp(supplier, group.items)}
                          disabled={sendingSupplier === supplier}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {sendingSupplier === supplier ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                              Отправить
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* === TRANSIT TAB - Waiting for delivery === */}
        {activeTab === "transit" && (
          <>
            {!hasInTransit ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🚚</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Нет доставок</h3>
                <p className="text-slate-400">Отправленные заказы появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentBySupplier.map(([supplier, group]) => (
                  <div key={supplier} className="bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <span className="text-xl">🚚</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{supplier}</h3>
                          <p className="text-sm text-slate-400">{group.items.length} позиций</p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-700">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{item.name}</span>
                            <span className="text-slate-400 text-sm">
                              Заказано: {item._orderedQty} {item.unit || "шт"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Получено:</span>
                            <input
                              type="number"
                              value={item._receivedQty}
                              onChange={(e) => handleReceivedQuantityChange(item._key, e.target.value)}
                              className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-green-500"
                              step="0.1"
                            />
                            <span className="text-slate-400 text-sm">{item.unit || "шт"}</span>
                            {item._receivedQty !== item._orderedQty && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item._receivedQty < item._orderedQty 
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}>
                                {item._receivedQty < item._orderedQty ? "−" : "+"}
                                {Math.abs(item._receivedQty - item._orderedQty)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-slate-700/50">
                      <button
                        onClick={() => handleConfirmDelivery(supplier, group.items)}
                        disabled={updating}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updating ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>✓</span>
                            Принять поставку
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
    </div>
  );
}
