"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { getUserRootUrlSync } from "@/lib/navigation";
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
  const [backLink, setBackLink] = useState<string>("/"); // Dynamic back link based on user role
  
  // Quantity adjustments for pending items: { `${orderId}-${itemIdx}`: quantity }
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  
  // Received quantities for in-transit items: { `${orderId}-${itemIdx}`: quantity }
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receivedPrices, setReceivedPrices] = useState<Record<string, number>>({});
  const [posterPrices, setPosterPrices] = useState<Record<string, { price: number; unit: string }>>({});
  
  // Track which supplier group is being sent
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);
  const [confirmingSupplier, setConfirmingSupplier] = useState<string | null>(null);

  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isManager = userRole === "manager" || userRole === "admin";
  const canSendOrders = isManager || (permissions?.canSendOrders ?? false);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && activeTab === "transit" && Object.keys(posterPrices).length === 0) {
      fetchPosterPrices();
    }
  }, [status, activeTab]);

  const fetchPosterPrices = async () => {
    try {
      const res = await api.get<{ success: boolean, data: Record<string, { price: number; unit: string }> }>("/api/poster/ingredients");
      if (res.success && res.data) {
        setPosterPrices(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch Poster prices", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First load permissions to determine what orders to fetch
      const permissionsRes = await api.get<UserOrderPermissions>("/api/user-sections?permissions=true");
      
      let userCanSend = isManager;
      let userSections: { id: number; name: string }[] = [];
      
      if (permissionsRes.success && permissionsRes.data) {
        setPermissions(permissionsRes.data);
        userCanSend = isManager || (permissionsRes.data.canSendOrders ?? false);
        
        // Extract sections from sectionPermissions
        userSections = permissionsRes.data.sectionPermissions
          .filter(sp => sp.section_name) // Filter out any without names
          .map(sp => ({
            id: sp.section_id,
            name: sp.section_name!
          }));
      }

      // Determine the back link using the navigation helper
      const rootUrl = getUserRootUrlSync(isManager, null, userSections);
      setBackLink(rootUrl);

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
          _quantity: pendingQuantities[key] ?? item.quantity ?? 0,
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
        
        const posterInfo = posterPrices[item.poster_id] || 
                           posterPrices[item.productId] || 
                           posterPrices[item.ingredient_id];
        
        const defaultPrice = receivedPrices[key] ?? item.price ?? posterInfo?.price ?? 0;

        groups.get(supplier)!.items.push({
          ...item,
          _key: key,
          _orderId: order.id,
          _itemIdx: idx,
          _orderedQty: item.quantity,
          _receivedQty: receivedQuantities[key] ?? item.quantity,
          _receivedPrice: defaultPrice,
          _posterPrice: posterInfo?.price || 0
        });
        groups.get(supplier)!.orderIds.add(order.id);
      });
    });
    
    return Array.from(groups.entries());
  }, [orders, receivedQuantities, receivedPrices, posterPrices]);

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

  const handleReceivedQuantityChange = (key: string, value: number) => {
    setReceivedQuantities(prev => ({ ...prev, [key]: Math.max(0, value) }));
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
    const affectedOrderIds = new Set<number>();
    items.forEach(item => {
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
        const newQty = quantityMap[key] !== undefined ? quantityMap[key] : originalItem.quantity;
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

  // Copy order to clipboard as text
  const copyOrderToClipboard = (supplierName: string, items: any[]) => {
    const itemsToCopy = items.filter(i => i._quantity > 0);
    if (itemsToCopy.length === 0) {
      toast.error("Нет товаров для копирования");
      return;
    }

    const restaurantName = session?.user?.restaurantId || "Ресторан";
    const dateStr = new Date().toLocaleDateString("ru-RU");

    let message = `📦 Заказ от ${restaurantName}\n📅 ${dateStr}\n\n`;
    itemsToCopy.forEach((item, idx) => {
      message += `${idx + 1}. ${item.name} — ${item._quantity} ${translateUnit(item.unit || "шт")}\n`;
    });
    message += `\n━━━━━━━━━━━━\nИтого: ${itemsToCopy.length} позиций`;

    navigator.clipboard.writeText(message);
    toast.success("✓ Скопировано в буфер");
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
        message += `${idx + 1}. ${item.name} — ${item._quantity} ${translateUnit(item.unit || "шт")}\n`;
      });
      message += `\n━━━━━━━━━━━━\nИтого: ${itemsToSend.length} позиций`;

      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url.length > 2000 ? `https://wa.me/${cleanPhone}` : url, "_blank");
    } else {
      toast.warning(`Телефон не найден для "${supplierName}"`);
    }

    try {
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
  const handleConfirmDelivery = async (supplierName: string, items: any[], missingAction: 'transit' | 'pending' | 'cancel' = 'transit') => {
    setUpdating(true);
    
    try {
      // 1. Prepare items for Poster (ONLY items with Fact > 0)
      const receivedItems = items.filter(item => {
        const qty = receivedQuantities[item._key] ?? item._orderedQty;
        return qty > 0 && (item.poster_id || item.productId);
      });
      
      if (receivedItems.length > 0) {
        const supplier = suppliers.find(s => s.name === supplierName);
        const localSupplierId = supplier?.id;
        
        const posterPayload = {
          supplier_id: localSupplierId,
          storage_id: 1,
          items: receivedItems.map(item => ({
            ingredient_id: String(item.poster_id || item.productId),
            quantity: receivedQuantities[item._key] ?? item._orderedQty,
            price: receivedPrices[item._key] ?? item._receivedPrice ?? 0,
          })),
          comment: `Приёмка от ${supplierName}`,
        };
        
        try {
          const posterResult = await api.post("/api/poster/supply-order", posterPayload) as any;
          if (posterResult.success && !posterResult.skipped && !posterResult.warning) {
            toast.success(`✓ Отправлено в Poster`);
          } else if (posterResult.warning) {
            toast.warning("Poster: " + posterResult.message);
          }
        } catch (posterError) {
          console.error("Poster error:", posterError);
          toast.warning("Poster: не удалось создать поставку");
        }
      }
      
      // 2. Prepare items for the new split API
      const apiItems = items.map(item => ({
        _orderId: item._orderId,
        _itemIdx: item._itemIdx,
        receivedQty: receivedQuantities[item._key] ?? item._orderedQty,
        receivedPrice: receivedPrices[item._key] ?? item._receivedPrice ?? 0,
      }));

      const updateResult = await api.post("/api/orders/receive", { 
        items: apiItems,
        missingItemsAction: missingAction
      });
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update");
      }
      
      toast.success("✓ Поставка принята");
      setReceivedQuantities({});
      setReceivedPrices({});
      setConfirmingSupplier(null);
      await loadData();
    } catch (error) {
      console.error("Delivery error:", error);
      toast.error("Ошибка при приёмке");
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptAll = async (supplierName: string, items: any[]) => {
    const newReceivedQty: Record<string, number> = { ...receivedQuantities };
    const newReceivedPrices: Record<string, number> = { ...receivedPrices };
    
    items.forEach(item => {
      delete newReceivedQty[item._key];
      delete newReceivedPrices[item._key];
    });
    
    setReceivedQuantities(newReceivedQty);
    setReceivedPrices(newReceivedPrices);
    
    await handleConfirmDelivery(supplierName, items, 'transit');
  };

  const handleOpenConfirmModal = (supplierName: string, items: any[]) => {
    const missingItems = items.filter(i => (receivedQuantities[i._key] ?? i._orderedQty) === 0);
    if (missingItems.length > 0) {
      setConfirmingSupplier(supplierName);
    } else {
      handleConfirmDelivery(supplierName, items, 'transit');
    }
  };

  const translateUnit = (unit: string) => {
    const unitMap: Record<string, string> = {
      'kg': 'кг',
      'l': 'л',
      'pcs': 'шт',
      'p': 'шт',
      'pt': 'шт',
      'unit': 'шт',
      'pack': 'уп',
      'bottle': 'бут',
      'can': 'банка',
      'portion': 'порц',
      'g': 'г',
      'ml': 'мл'
    };
    return unitMap[unit.toLowerCase()] || unit;
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
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center mb-4">
            <Link 
              href={backLink}
              className="absolute left-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Заказы</h1>
          </div>

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
                <div className="bg-white pt-4 pb-24">
                  {pendingBySupplier.map(([supplier, group]) => (
                    <div key={supplier} className="mt-6 first:mt-0">
                      <div className="px-4 mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-500">{supplier}</h3>
                        <span className="text-xs text-gray-400">{group.items.length} поз.</span>
                      </div>
                      <div className="divide-y divide-gray-100 border-b border-gray-100">
                        {group.items.map(item => {
                          const isZero = item._quantity === 0;
                          return (
                            <div key={item._key} className={`px-4 py-4 transition-colors ${isZero ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 className={`font-medium truncate ${isZero ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.name}</h3>
                                  <p className="text-xs text-gray-500 mt-0.5">{item._department || "—"}</p>
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
                      {canSendOrders && (
                        <div className="px-4 mt-4 mb-8 flex gap-2">
                          <button onClick={() => copyOrderToClipboard(supplier, group.items)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">Копировать</button>
                          <button onClick={() => sendToWhatsApp(supplier, group.items)} disabled={sendingSupplier === supplier} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">Отправить</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {hasChanges && (
                  <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center">
                    <button onClick={handleSaveChanges} disabled={updating} className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70">
                      {updating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Сохранить изменения"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "transit" && (
          <div className="bg-white">
            {sentBySupplier.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img src="/icons/delivery.svg" alt="Transit" className="w-10 h-10 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Нет доставок</h3>
              </div>
            ) : (
              <div className="pb-20">
                {sentBySupplier.map(([supplier, group]) => {
                  const acceptedCount = group.items.filter(i => (receivedQuantities[i._key] ?? i._orderedQty) > 0).length;
                  
                  return (
                    <div key={supplier}>
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-y border-gray-200">
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{supplier}</h3>
                          <p className="text-xs text-gray-500">{group.items.length} поз. • {acceptedCount} к приёмке</p>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.items.map((item, idx) => {
                          const currentQty = receivedQuantities[item._key] ?? item._orderedQty;
                          const isExcluded = currentQty === 0;
                          const diff = currentQty - item._orderedQty;
                          const isDifferent = diff !== 0;
                          const orderedTextColor = isDifferent ? (diff < 0 ? "text-orange-600" : "text-green-600") : "text-gray-500";
                          
                          return (
                            <div key={idx} className={`px-4 py-4 transition-colors ${isExcluded ? 'opacity-40 bg-gray-50' : isDifferent ? 'bg-orange-50/30' : 'hover:bg-gray-50'}`}>
                              <div className="flex flex-col gap-2">
                                <h3 className={`font-medium text-gray-900 ${isExcluded ? 'line-through' : ''}`}>{item.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                  <div className="flex flex-col">
                                    <p className={`text-xs font-medium ${orderedTextColor} whitespace-nowrap`}>
                                      Заказано: {item._orderedQty} {translateUnit(item.unit || "шт")}{isDifferent && !isExcluded && ` (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`}
                                    </p>
                                    {isExcluded && <span className="text-[10px] text-gray-400 uppercase">Пропущено</span>}
                                  </div>
                                  <div className="flex items-center gap-3 ml-auto sm:ml-0">
                                    {!isExcluded && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-gray-400">Цена:</span>
                                        <input type="number" value={receivedPrices[item._key] ?? item._receivedPrice} onChange={(e) => handleReceivedPriceChange(item._key, e.target.value)} className="w-16 bg-white border border-gray-200 rounded-lg px-1 py-1 text-gray-900 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-green-500" step="0.01" min="0" />
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-gray-400">Факт ({translateUnit(item.unit || "шт")}):</span>
                                      <input type="number" value={currentQty} onChange={(e) => handleReceivedQuantityChange(item._key, parseFloat(e.target.value) || 0)} className={`w-16 bg-white border rounded-lg px-1 py-1 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-green-500 ${isDifferent ? 'border-orange-300 text-orange-700' : 'border-gray-200 text-gray-900'}`} step="0.1" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-3 bg-gray-50 flex gap-3 justify-end border-t border-gray-200 sticky bottom-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                        <button onClick={() => handleRevertToPending(group.items)} disabled={updating} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">↩ Вернуть</button>
                        <button onClick={() => handleOpenConfirmModal(supplier, group.items)} disabled={updating} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"> {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `Принять (${acceptedCount})`} </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white divide-y divide-gray-100">
            {historyOrders.map(order => (
              <div key={order.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 font-medium">#{order.id} · {order.order_data.department}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {order.status === 'delivered' ? 'Доставлено' : 'Отменено'}
                  </span>
                </div>
                <p className="text-sm text-slate-400"> {formatDate(order.created_at)} · {order.order_data.items?.length || 0} позиций </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Missing Items Action Modal */}
      {confirmingSupplier && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !updating && setConfirmingSupplier(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 pt-8 pb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 text-orange-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Обнаружены расхождения</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Часть товаров не была получена. Что сделать с недостающим количеством?</p>
            </div>
            
            <div className="px-4 pb-8 flex flex-col gap-2">
              <button 
                onClick={() => handleConfirmDelivery(confirmingSupplier, sentBySupplier.find(s => s[0] === confirmingSupplier)?.[1].items || [], 'transit')}
                disabled={updating}
                className="w-full p-4 text-left hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Оставить «В пути»</p>
                  <p className="text-xs text-gray-400">Поставщик довезет их позже</p>
                </div>
              </button>

              <button 
                onClick={() => handleConfirmDelivery(confirmingSupplier, sentBySupplier.find(s => s[0] === confirmingSupplier)?.[1].items || [], 'pending')}
                disabled={updating}
                className="w-full p-4 text-left hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Вернуть в «Ожидание»</p>
                  <p className="text-xs text-gray-400">Перезаказать у другого поставщика</p>
                </div>
              </button>

              <button 
                onClick={() => handleConfirmDelivery(confirmingSupplier, sentBySupplier.find(s => s[0] === confirmingSupplier)?.[1].items || [], 'cancel')}
                disabled={updating}
                className="w-full p-4 text-left hover:bg-red-50 rounded-2xl border border-gray-100 hover:border-red-100 transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm text-red-600">Отменить товары</p>
                  <p className="text-xs text-red-400">Товары больше не нужны</p>
                </div>
              </button>

              <button 
                onClick={() => !updating && setConfirmingSupplier(null)}
                className="w-full p-4 text-center font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
