"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { QuantityInput } from "@/components/ui/QuantityInput";
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
  const [receivedPrices, setReceivedPrices] = useState<Record<string, number>>({});
  
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
      // First load permissions to determine what orders to fetch
      const permissionsRes = await api.get<UserOrderPermissions>("/api/user-sections?permissions=true");
      
      let userCanSend = isManager;
      if (permissionsRes.success && permissionsRes.data) {
        setPermissions(permissionsRes.data);
        userCanSend = isManager || (permissionsRes.data.canSendOrders ?? false);
      }

      // Staff without send permission only sees their own orders
      // Staff with send permission or managers see all orders
      const ordersUrl = (isStaff && !userCanSend) 
        ? "/api/orders?my=true&limit=50" 
        : "/api/orders";

      const [ordersRes, suppliersRes] = await Promise.all([
        api.get<Order[]>(ordersUrl),
        api.get<Supplier[]>("/api/suppliers"),
      ]);

      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
      }
      if (suppliersRes.success && Array.isArray(suppliersRes.data)) {
        setSuppliers(suppliersRes.data);
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

  // Group pending items by department for display
  const pendingByDepartment = useMemo(() => {
    const deptGroups = new Map<string, any[]>();
    
    pendingItems.filter(i => i._quantity > 0).forEach(item => {
      const dept = item._department || "Общее";
      if (!deptGroups.has(dept)) {
        deptGroups.set(dept, []);
      }
      deptGroups.get(dept)!.push(item);
    });
    
    return Array.from(deptGroups.entries());
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
  const hasChanges = Object.keys(pendingQuantities).length > 0;

  // Handlers
  const handlePendingQuantityChange = (key: string, delta: number) => {
    setPendingQuantities(prev => {
      const item = pendingItems.find(i => i._key === key);
      if (!item) return prev;
      const current = prev[key] ?? item.quantity;
      return { ...prev, [key]: Math.max(0, current + delta) };
    });
  };

  const handleSetPendingQuantity = (key: string, value: number) => {
    setPendingQuantities(prev => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleReceivedQuantityChange = (key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setReceivedQuantities(prev => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const handleReceivedPriceChange = (key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setReceivedPrices(prev => ({ ...prev, [key]: Math.max(0, num) }));
  };

  const handleRemoveItem = (key: string) => {
    setPendingQuantities(prev => ({ ...prev, [key]: 0 }));
  };

  // Helper to build update payload
  const getUpdatesPayload = (items: any[], quantityMap: Record<string, number>, priceMap?: Record<string, number>) => {
    const updates = new Map<number, any[]>();
    
    // Better approach: Iterate over affected orders
    const affectedOrderIds = new Set<number>();
    items.forEach(item => {
      // Check for quantity or price changes
      if (quantityMap[item._key] !== undefined || (priceMap && priceMap[item._key] !== undefined)) {
        affectedOrderIds.add(item._orderId);
      }
    });
    
    const payload: { id: number, items: any[] }[] = [];
    
    affectedOrderIds.forEach(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const newItems = (order.order_data.items || []).map((originalItem: any, idx: number) => {
        const key = `${orderId}-${idx}`;
        // Use new quantity if exists, otherwise keep original
        const newQty = quantityMap[key] !== undefined ? quantityMap[key] : originalItem.quantity;
        // Use new price if exists, otherwise keep original
        const newPrice = priceMap && priceMap[key] !== undefined ? priceMap[key] : originalItem.price;
        
        return { ...originalItem, quantity: newQty, price: newPrice };
      });
      
      payload.push({ id: orderId, items: newItems });
    });
    
    return payload;
  };

  // Save changes without sending
  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    setUpdating(true);
    
    try {
      const updates = getUpdatesPayload(pendingItems, pendingQuantities);
      const orderIds = updates.map(u => u.id);
      
      // We call bulk-update with status='pending' (no change) but with updates
      const response = await api.post("/api/orders/bulk-update", { 
        ids: orderIds, 
        status: "pending",
        updates: updates 
      });
      
      if (response.success) {
        toast.success("Изменения сохранены");
        setPendingQuantities({});
        await loadData();
      } else {
        toast.error("Ошибка при сохранении");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка сохранения");
    } finally {
      setUpdating(false);
    }
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

    // Update order status AND quantities
    try {
      // We need to build updates payload for these items
      // Note: items here are the grouped ones. We should look at pendingQuantities for them.
      const updates = getUpdatesPayload(items, pendingQuantities);
      const orderIds = [...new Set(items.map(i => i._orderId))];
      
      await api.post("/api/orders/bulk-update", { 
        ids: orderIds, 
        status: "sent",
        updates: updates
      });
      
      toast.success("✓ Отправлено");
      await loadData();
      setPendingQuantities({});
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при обновлении статуса");
    } finally {
      setSendingSupplier(null);
    }
  };

  // Revert items to pending
  const handleRevertToPending = async (items: any[]) => {
    if (!confirm("Вернуть эти товары в статус 'К отправке'?")) return;
    setUpdating(true);
    const orderIds = [...new Set(items.map(i => i._orderId))];
    try {
      const updateResult = await api.post("/api/orders/bulk-update", { ids: orderIds, status: "pending" });
      if (updateResult.success) {
        toast.success("Заказы возвращены в ожидание");
        await loadData();
      } else {
        toast.error("Ошибка при обновлении");
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка сервера");
    } finally {
      setUpdating(false);
    }
  };

  // Confirm delivery with adjusted quantities and send to Poster
  const handleConfirmDelivery = async (supplierName: string, items: any[]) => {
    setUpdating(true);
    
    const orderIds = [...new Set(items.map(i => i._orderId))];
    
    try {
      // 1. First, try to send supply to Poster (if items have poster_id)
      const posterItems = items.filter(i => i.poster_id || i.productId);
      
      console.log("All items:", items);
      console.log("Poster items (with poster_id):", posterItems);
      
      if (posterItems.length > 0) {
        // Find supplier's local ID (not poster_supplier_id)
        const supplier = suppliers.find(s => s.name === supplierName);
        const localSupplierId = supplier?.id; // Use local database ID
        
        const posterPayload = {
          supplier_id: localSupplierId, // Send local ID - API will look up poster_supplier_id
          storage_id: 1, // Default storage
          items: posterItems.map(item => ({
            ingredient_id: String(item.poster_id || item.productId),
            quantity: item._receivedQty || item.quantity,
            price: receivedPrices[item._key] ?? item.price ?? 0,
          })),
          comment: `Приёмка от ${supplierName}`,
        };
        
        console.log("Sending to Poster:", posterPayload);
        
        try {
          const posterResult = await api.post("/api/poster/supply-order", posterPayload) as any;
          console.log("Poster result:", posterResult);
          
          if (posterResult.success && !posterResult.skipped && !posterResult.warning) {
            console.log("Poster success data:", posterResult.data);
            const dataStr = JSON.stringify(posterResult.data, null, 2);
            // Show the actual response from Poster to the user
            toast.success(`✓ Отправлено в Poster. Ответ: ${dataStr}`);
          } else if (posterResult.warning) {
            toast.warning("Poster: " + posterResult.message);
          } else if (posterResult.skipped) {
            console.log("Poster skipped:", posterResult.message);
          }
        } catch (posterError) {
          console.error("Poster error:", posterError);
          toast.warning("Poster: не удалось создать поставку");
        }
      } else {
        console.log("No items with poster_id found - skipping Poster");
      }
      
      // 2. Update order status to delivered AND save received quantities
      const updates = getUpdatesPayload(items, receivedQuantities, receivedPrices);
      
      const updateResult = await api.post("/api/orders/bulk-update", { 
        ids: orderIds, 
        status: "delivered",
        updates: updates
      });
      
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-between mb-4">
            <Link 
              href="/" 
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900">
              Заказы
            </h1>
            
            <button 
              onClick={loadData}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-lg flex items-center justify-center gap-1 ${
                activeTab === "pending" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span className="whitespace-nowrap">{canSendOrders ? "Отправить" : "Заявки"}</span>
            </button>
            {canSendOrders && (
              <button
                onClick={() => setActiveTab("transit")}
                className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-lg flex items-center justify-center gap-1 ${
                  activeTab === "transit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span className="whitespace-nowrap">В пути</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-2 text-sm font-medium transition-all rounded-lg flex items-center justify-center gap-1 ${
                activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span className="whitespace-nowrap">История</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* === PENDING TAB - Items to send === */}
        {activeTab === "pending" && (
          <>
            {!hasPending ? (
              <div className="text-center py-16 px-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img src="/icons/box.svg" alt="Box" className="w-10 h-10 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Нет заявок</h3>
                <p className="text-gray-500">Новые заявки появятся здесь</p>
              </div>
            ) : (
              <div>
                {/* Items list grouped by department */}
                <div className="bg-white pt-4">
                  {pendingByDepartment.map(([department, deptItems]) => (
                    <div key={department} className="mt-6 first:mt-0">
                      {/* Department Header */}
                      <div className="px-4 mb-3">
                        <h3 className="text-sm font-medium text-gray-500">{department}</h3>
                      </div>
                      
                      {/* Department Items */}
                      <div className="divide-y divide-gray-100">
                        {deptItems.map(item => {
                          const isZero = item._quantity === 0;
                          return (
                            <div 
                              key={item._key}
                              className={`px-4 py-4 transition-colors ${isZero ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 className={`font-medium truncate ${isZero ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.name}</h3>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {item.supplier || "—"}
                                  </p>
                                </div>
                              
                                <div className="flex items-center gap-2">
                                  <QuantityInput
                                    productName={item.name}
                                    quantity={item._quantity}
                                    unit={item.unit || "шт"}
                                    onQuantityChange={(newQty) => handleSetPendingQuantity(item._key, newQty)}
                                    min={0}
                                    compact={true}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Changes Button (Floating) */}
                {hasChanges && (
                  <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center">
                    <button
                      onClick={handleSaveChanges}
                      disabled={updating}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70"
                    >
                      {updating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Сохранить изменения
                    </button>
                  </div>
                )}

                {/* Supplier breakdown - only for users who can send */}
                {canSendOrders && (
                  <>
                    <div className="mt-6 px-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Поставщики</h3>
                    </div>
                    <div className="bg-white">
                      <div className="divide-y divide-gray-100">
                        {pendingBySupplier.map(([supplier, group]) => (
                          <div key={supplier} className="px-4 py-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{supplier}</p>
                                <p className="text-xs text-gray-500">{group.items.length} позиций</p>
                              </div>
                            </div>
                            <button
                              onClick={() => sendToWhatsApp(supplier, group.items)}
                              disabled={sendingSupplier === supplier}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* === TRANSIT TAB - Waiting for delivery === */}
        {activeTab === "transit" && (
          <>
            {!hasInTransit ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img src="/icons/delivery.svg" alt="Transit" className="w-10 h-10 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Нет доставок</h3>
                <p className="text-gray-500">Отправленные заказы появятся здесь</p>
              </div>
            ) : (
              <div className="bg-white">
                <div className="divide-y divide-gray-100">
                  {sentBySupplier.map(([supplier, group]) => (
                    <div key={supplier}>
                      {/* Supplier Header */}
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 first:border-t-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-700">
                            <img src="/icons/delivery.svg" alt="Transit" className="w-4 h-4 opacity-70" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">{supplier}</h3>
                            <p className="text-xs text-gray-500">{group.items.length} позиций</p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-gray-100">
                        {group.items.map((item, idx) => {
                          const diff = item._receivedQty - item._orderedQty;
                          const isDifferent = diff !== 0;
                          const orderedTextColor = isDifferent 
                            ? (diff < 0 ? "text-red-600" : "text-green-600")
                            : "text-gray-500";
                          
                          return (
                            <div key={idx} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                              {/* Mobile Layout: Stacked */}
                              <div className="flex flex-col gap-3">
                                
                                {/* Top Row: Name and Ordered Info */}
                                <div className="w-full">
                                  <h3 className="font-medium text-gray-900 break-words">{item.name}</h3>
                                  <p className={`text-xs mt-0.5 font-medium ${orderedTextColor}`}>
                                    Заказано: {item._orderedQty} {item.unit || "шт"}
                                  </p>
                                </div>

                                {/* Bottom Row: Inputs */}
                                <div className="flex items-center gap-3">
                                   {/* Price */}
                                   <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                     <span className="text-xs text-gray-500 pl-2">Цена:</span>
                                     <input
                                       type="number"
                                       value={receivedPrices[`${item._orderId}-${idx}`] ?? item.price ?? 0}
                                       onChange={(e) => handleReceivedPriceChange(`${item._orderId}-${idx}`, e.target.value)}
                                       className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                       step="0.01"
                                       min="0"
                                     />
                                   </div>
                                   {/* Quantity */}
                                   <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                     <span className="text-xs text-gray-500 pl-2">Факт:</span>
                                     <input
                                       type="number"
                                       value={item._receivedQty}
                                       onChange={(e) => handleReceivedQuantityChange(item._key, e.target.value)}
                                       className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                       step="0.1"
                                     />
                                   </div>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions Footer */}
                      <div className="px-4 py-3 bg-gray-50 flex gap-3 justify-end border-t border-gray-200">
                        <button
                          onClick={() => handleRevertToPending(group.items)}
                          disabled={updating}
                          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          title="Вернуть в ожидание"
                        >
                          ↩ Вернуть
                        </button>
                        <button
                          onClick={() => handleConfirmDelivery(supplier, group.items)}
                          disabled={updating}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {updating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <img src="/icons/check.svg" alt="Confirm" className="w-4 h-4 invert brightness-0 filter" />
                              Принять
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

        {/* === HISTORY TAB === */}
        {activeTab === "history" && (
          <div>
            {historyOrders.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">История пуста</h3>
                <p className="text-gray-500">Завершённые заказы появятся здесь</p>
              </div>
            ) : (
              <div className="bg-white">
                <div className="divide-y divide-gray-100">
                  {historyOrders.map(order => (
                    <div key={order.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">#{order.id}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">{order.order_data.department}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'delivered' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
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
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
