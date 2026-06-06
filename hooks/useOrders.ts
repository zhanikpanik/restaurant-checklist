"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { clientCache, fetchWithCache } from "@/lib/client-cache";
import { getUserRootUrlSync } from "@/lib/navigation";
import { useToast } from "@/components/ui/Toast";
import type { Order, Supplier, UserOrderPermissions } from "@/types";

export type TabType = "pending" | "transit" | "history";

interface PosterPriceInfo {
  price: number;
  unit: string;
}

export interface OrderItemView {
  _key: string;
  _orderId: number;
  _itemIdx: number;
  _department?: string;
  _quantity: number;
  _orderedQty?: number;
  _receivedQty?: number | "";
  _receivedPrice?: number;
  _posterPrice?: number;
  name: string;
  quantity: number;
  unit?: string;
  supplier?: string;
  poster_id?: string;
  productId?: number;
  ingredient_id?: string;
  price?: number;
  category?: string;
}

export interface SupplierGroup {
  items: OrderItemView[];
  orderIds: Set<number>;
}

export function useOrders() {
  const { data: session, status } = useSession();
  const toast = useToast();

  // ── Core state ───────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>(
    () => clientCache.get("orders_list") || []
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    () => clientCache.get("orders_suppliers") || []
  );
  const [permissions, setPermissions] = useState<UserOrderPermissions | null>(
    () => clientCache.get("orders_permissions") || null
  );
  const [loading, setLoading] = useState(!clientCache.has("orders_list"));
  const [updating, setUpdating] = useState(false);

  // ── UI state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [backLink, setBackLink] = useState<string>("/");
  const [sendingSupplier, setSendingSupplier] = useState<string | null>(null);
  const [confirmingSupplier, setConfirmingSupplier] = useState<string | null>(
    null
  );

  // ── Quantity maps (key = `${orderId}-${itemIdx}`) ───────
  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, number>
  >({});
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number | "">
  >({});
  const [receivedPrices, setReceivedPrices] = useState<
    Record<string, number | "">
  >({});
  const [posterPrices, setPosterPrices] = useState<
    Record<string, PosterPriceInfo>
  >(() => clientCache.get("poster_prices") || {});

  // ── Derived user info ────────────────────────────────────
  const userRole = session?.user?.role || "staff";
  const isStaff = userRole === "staff";
  const isManager = userRole === "manager" || userRole === "admin";
  const canSendOrders = isManager || (permissions?.canSendOrders ?? false);

  // ── Data loading ─────────────────────────────────────────
  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      activeTab === "transit" &&
      Object.keys(posterPrices).length === 0
    ) {
      fetchPosterPrices();
    }
  }, [status, activeTab]);

  const fetchPosterPrices = async () => {
    try {
      const data = await fetchWithCache("/api/poster/ingredients");
      if (data?.success && data.data) {
        setPosterPrices(data.data);
        clientCache.set("poster_prices", data.data);
      }
    } catch (e) {
      console.error("Failed to fetch Poster prices", e);
    }
  };

  const loadData = async () => {
    if (!orders.length) setLoading(true);
    try {
      const permissionsData = await fetchWithCache(
        "/api/user-sections?permissions=true"
      );

      let userCanSend = isManager;
      let userSections: { id: number; name: string }[] = [];

      if (permissionsData?.success && permissionsData.data) {
        setPermissions(permissionsData.data);
        clientCache.set("orders_permissions", permissionsData.data);
        userCanSend =
          isManager || (permissionsData.data.canSendOrders ?? false);

        userSections = permissionsData.data.sectionPermissions
          .filter((sp: any) => sp.section_name)
          .map((sp: any) => ({
            id: sp.section_id,
            name: sp.section_name!,
          }));
      }

      const rootUrl = getUserRootUrlSync(isManager, null, userSections);
      setBackLink(rootUrl);

      const ordersUrl =
        isStaff && !userCanSend
          ? "/api/orders?my=true&limit=50"
          : "/api/orders";

      const [ordersData, suppliersData] = await Promise.all([
        fetchWithCache(ordersUrl),
        fetchWithCache("/api/suppliers"),
      ]);

      if (ordersData?.success && Array.isArray(ordersData.data)) {
        setOrders(ordersData.data);
        clientCache.set("orders_list", ordersData.data);
      }
      if (suppliersData?.success && Array.isArray(suppliersData.data)) {
        setSuppliers(suppliersData.data);
        clientCache.set("orders_suppliers", suppliersData.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived: flatten pending items ───────────────────────
  const pendingItems = useMemo((): OrderItemView[] => {
    const items: OrderItemView[] = [];
    orders.forEach((order) => {
      if (order.status !== "pending") return;
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

  // ── Derived: sent items grouped by supplier ──────────────
  const sentBySupplier = useMemo((): [string, SupplierGroup][] => {
    const groups = new Map<string, SupplierGroup>();

    orders.forEach((order) => {
      if (order.status !== "sent") return;
      (order.order_data.items || []).forEach((item: any, idx: number) => {
        const supplier = item.supplier || "Без поставщика";
        const key = `${order.id}-${idx}`;

        if (!groups.has(supplier)) {
          groups.set(supplier, { items: [], orderIds: new Set() });
        }

        const posterInfo =
          posterPrices[item.poster_id] ||
          posterPrices[item.productId] ||
          posterPrices[item.ingredient_id];

        const defaultPrice =
          receivedPrices[key] ?? item.price ?? posterInfo?.price ?? 0;

        groups.get(supplier)!.items.push({
          ...item,
          _key: key,
          _orderId: order.id,
          _itemIdx: idx,
          _orderedQty: item.quantity,
          _receivedQty: receivedQuantities[key] ?? item.quantity,
          _receivedPrice: defaultPrice,
          _posterPrice: posterInfo?.price || 0,
        });
        groups.get(supplier)!.orderIds.add(order.id);
      });
    });

    return Array.from(groups.entries());
  }, [orders, receivedQuantities, receivedPrices, posterPrices]);

  // ── Derived: pending grouped by supplier ─────────────────
  const pendingBySupplier = useMemo((): [string, SupplierGroup][] => {
    const groups = new Map<string, SupplierGroup>();

    pendingItems
      .filter((i) => i._quantity > 0)
      .forEach((item) => {
        const supplier = item.supplier || "Без поставщика";
        if (!groups.has(supplier)) {
          groups.set(supplier, { items: [], orderIds: new Set() });
        }
        groups.get(supplier)!.items.push(item);
        groups.get(supplier)!.orderIds.add(item._orderId);
      });

    return Array.from(groups.entries());
  }, [pendingItems]);

  // ── Derived: history orders ──────────────────────────────
  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => ["delivered", "cancelled"].includes(o.status))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [orders]);

  // ── Computed flags ───────────────────────────────────────
  const hasPending =
    pendingItems.filter((i) => i._quantity > 0).length > 0;
  const hasChanges = Object.keys(pendingQuantities).length > 0;

  // ── Quantities: pending ──────────────────────────────────
  const handleSetPendingQuantity = (key: string, value: number) => {
    setPendingQuantities((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  // ── Quantities: received ─────────────────────────────────
  const handleReceivedQuantityChange = (
    key: string,
    value: string | number
  ) => {
    if (value === "") {
      setReceivedQuantities((prev) => ({ ...prev, [key]: "" }));
    } else {
      const num = typeof value === "string" ? parseFloat(value) : value;
      setReceivedQuantities((prev) => ({
        ...prev,
        [key]: Math.max(0, num || 0),
      }));
    }
  };

  const handleReceivedPriceChange = (key: string, value: string) => {
    if (value === "") {
      setReceivedPrices((prev) => ({ ...prev, [key]: "" }));
    } else {
      const num = parseFloat(value) || 0;
      setReceivedPrices((prev) => ({ ...prev, [key]: Math.max(0, num) }));
    }
  };

  // ── Helper: build update payload ─────────────────────────
  const getUpdatesPayload = (
    items: OrderItemView[],
    quantityMap: Record<string, number>,
    priceMap?: Record<string, number>
  ) => {
    const sentItemKeys = new Set(items.map((i) => i._key));
    const affectedOrderIds = new Set<number>();
    items.forEach((item) => affectedOrderIds.add(item._orderId));

    const payload: { id: number; items: any[] }[] = [];

    affectedOrderIds.forEach((orderId) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const newItems = (order.order_data.items || [])
        .filter((originalItem: any, idx: number) => {
          const key = `${orderId}-${idx}`;
          return sentItemKeys.has(key);
        })
        .map((originalItem: any) => {
          const origIdx = (order.order_data.items || []).indexOf(originalItem);
          const key = `${orderId}-${origIdx}`;
          const newQty =
            quantityMap[key] !== undefined
              ? quantityMap[key]
              : originalItem.quantity;
          const newPrice =
            priceMap && priceMap[key] !== undefined
              ? priceMap[key]
              : originalItem.price;
          return { ...originalItem, quantity: newQty, price: newPrice };
        });

      if (newItems.length > 0) {
        payload.push({ id: orderId, items: newItems });
      }
    });

    return payload;
  };

  // ── Actions: save pending changes ────────────────────────
  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    setUpdating(true);

    try {
      const updates = getUpdatesPayload(pendingItems, pendingQuantities);
      const orderIds = updates.map((u) => u.id);

      const response = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "pending",
        updates,
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

  // ── Actions: copy to clipboard ───────────────────────────
  const copyOrderToClipboard = (supplierName: string, items: OrderItemView[]) => {
    const itemsToCopy = items.filter((i) => i._quantity > 0);
    if (itemsToCopy.length === 0) {
      toast.error("Нет товаров для копирования");
      return;
    }

    const restaurantName = session?.user?.restaurantId || "Ресторан";
    const dateStr = new Date().toLocaleDateString("ru-RU");

    let message = `📦 Заказ от ${restaurantName}\n📅 ${dateStr}\n\n`;
    itemsToCopy.forEach((item, idx) => {
      message += `${idx + 1}. ${item.name} — ${item._quantity} ${translateUnit(
        item.unit || "шт"
      )}\n`;
    });
    message += `\n━━━━━━━━━━━━\nИтого: ${itemsToCopy.length} позиций`;

    navigator.clipboard.writeText(message);
    toast.success("✓ Скопировано в буфер");
  };

  // ── Actions: send to WhatsApp ────────────────────────────
  const sendToWhatsApp = async (
    supplierName: string,
    items: OrderItemView[]
  ) => {
    setSendingSupplier(supplierName);

    const supplier = suppliers.find((s) => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");
    const itemsToSend = items.filter((i) => i._quantity > 0);

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
        message += `${idx + 1}. ${item.name} — ${item._quantity} ${translateUnit(
          item.unit || "шт"
        )}\n`;
      });
      message += `\n━━━━━━━━━━━━\nИтого: ${itemsToSend.length} позиций`;

      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(
        url.length > 2000 ? `https://wa.me/${cleanPhone}` : url,
        "_blank"
      );
    } else {
      toast.warning(`Телефон не найден для "${supplierName}"`);
    }

    try {
      const updates = getUpdatesPayload(items, pendingQuantities);
      const orderIds = [...new Set(items.map((i) => i._orderId))];

      await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "sent",
        updates,
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

  // ── Actions: revert to pending ───────────────────────────
  const handleRevertToPending = async (items: OrderItemView[]) => {
    if (!confirm("Вернуть эти товары в статус 'К отправке'?")) return;
    setUpdating(true);
    const orderIds = [...new Set(items.map((i) => i._orderId))];
    try {
      const updateResult = await api.post("/api/orders/bulk-update", {
        ids: orderIds,
        status: "pending",
      });
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

  // ── Actions: confirm delivery ────────────────────────────
  const handleConfirmDelivery = async (
    supplierName: string,
    items: OrderItemView[],
    missingAction: "transit" | "pending" | "cancel" = "transit"
  ) => {
    setUpdating(true);

    try {
      // 1. Send received items to Poster
      const receivedItems = items.filter((item) => {
        const rawQty = receivedQuantities[item._key] ?? item._orderedQty;
        const qty = rawQty === "" ? 0 : rawQty;
        return qty > 0 && (item.poster_id || item.productId);
      });

      if (receivedItems.length > 0) {
        const supplier = suppliers.find((s) => s.name === supplierName);
        const localSupplierId = supplier?.id;

        try {
          const posterResult = (await api.post("/api/poster/supply-order", {
            supplier_id: localSupplierId,
            storage_id: 1,
            items: receivedItems.map((item) => {
              const rawQty =
                receivedQuantities[item._key] ?? item._orderedQty;
              const rawPrice =
                receivedPrices[item._key] ?? item._receivedPrice ?? 0;
              return {
                ingredient_id: String(item.poster_id || item.productId),
                quantity: rawQty === "" ? 0 : rawQty,
                price: rawPrice === "" ? 0 : rawPrice,
              };
            }),
            comment: `Приёмка от ${supplierName}`,
          })) as any;

          if (
            posterResult.success &&
            !posterResult.skipped &&
            !posterResult.warning
          ) {
            toast.success("✓ Отправлено в Poster");
          } else if (posterResult.warning) {
            toast.warning("Poster: " + posterResult.message);
          }
        } catch (posterError) {
          console.error("Poster error:", posterError);
          toast.warning("Poster: не удалось создать поставку");
        }
      }

      // 2. Update local order status
      const apiItems = items.map((item) => {
        const rawQty = receivedQuantities[item._key] ?? item._orderedQty;
        const rawPrice =
          receivedPrices[item._key] ?? item._receivedPrice ?? 0;
        return {
          _orderId: item._orderId,
          _itemIdx: item._itemIdx,
          receivedQty: rawQty === "" ? 0 : rawQty,
          receivedPrice: rawPrice === "" ? 0 : (rawPrice as number),
        };
      });

      const updateResult = await api.post("/api/orders/receive", {
        items: apiItems,
        missingItemsAction: missingAction,
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

  const handleAcceptAll = async (supplierName: string, items: OrderItemView[]) => {
    const newReceivedQty: Record<string, number | ""> = {
      ...receivedQuantities,
    };
    const newReceivedPrices: Record<string, number | ""> = {
      ...receivedPrices,
    };

    items.forEach((item) => {
      delete newReceivedQty[item._key];
      delete newReceivedPrices[item._key];
    });

    setReceivedQuantities(newReceivedQty);
    setReceivedPrices(newReceivedPrices);

    await handleConfirmDelivery(supplierName, items, "transit");
  };

  const handleOpenConfirmModal = (
    supplierName: string,
    items: OrderItemView[]
  ) => {
    const missingItems = items.filter((i) => {
      const q = receivedQuantities[i._key] ?? i._orderedQty;
      return (q === "" ? 0 : q) === 0;
    });
    if (missingItems.length > 0) {
      setConfirmingSupplier(supplierName);
    } else {
      handleConfirmDelivery(supplierName, items, "transit");
    }
  };

  // ── Return everything the component needs ────────────────
  return {
    // Data
    orders,
    suppliers,
    loading,
    updating,
    // Session
    session,
    status,
    userRole,
    isStaff,
    isManager,
    canSendOrders,
    // Tabs
    activeTab,
    setActiveTab,
    backLink,
    // Derived data
    pendingItems,
    pendingBySupplier,
    sentBySupplier,
    historyOrders,
    // Flags
    hasPending,
    hasChanges,
    // Sending state
    sendingSupplier,
    confirmingSupplier,
    setConfirmingSupplier,
    // Quantity maps
    pendingQuantities,
    receivedQuantities,
    receivedPrices,
    posterPrices,
    // Handlers
    handleSetPendingQuantity,
    handleReceivedQuantityChange,
    handleReceivedPriceChange,
    handleSaveChanges,
    copyOrderToClipboard,
    sendToWhatsApp,
    handleRevertToPending,
    handleConfirmDelivery,
    handleAcceptAll,
    handleOpenConfirmModal,
    // Utilities
    translateUnit,
  };
}

// ── Utility (used by both hook and component) ──────────────
export function translateUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    kg: "кг",
    l: "л",
    pcs: "шт",
    p: "шт",
    pt: "шт",
    unit: "шт",
    pack: "уп",
    bottle: "бут",
    can: "банка",
    portion: "порц",
    g: "г",
    ml: "мл",
  };
  return unitMap[unit.toLowerCase()] || unit;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
