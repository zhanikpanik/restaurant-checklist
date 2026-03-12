"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { BottomSheet, FormInput, FormButton } from "@/components/ui/BottomSheet";
import type { Order } from "@/types";

interface Section {
  id: string;
  name: string;
  emoji: string;
  poster_storage_id?: string;
  custom_products_count?: number;
}

interface OrderSummary {
  type: 'pending' | 'transit' | 'last_order';
  count: number;
  departments?: Record<string, number>; // Map dept -> count
  suppliers?: Record<string, number>; // Map supplier -> count
  lastOrder?: Order;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [userSectionIds, setUserSectionIds] = useState<number[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [unsortedCount, setUnsortedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const isAdmin = session?.user?.role === "admin";
  const isManager = session?.user?.role === "manager";
  const isDelivery = session?.user?.role === "delivery";
  const isStaff = session?.user?.role === "staff";

  useEffect(() => {
    if (status === "authenticated") {
      loadSections();
      loadUserSections();
      loadOrderSummary();
      if (isAdmin || isManager) {
        loadUnsortedCount();
      }
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, isAdmin, isManager]);

  const loadUnsortedCount = async () => {
    try {
      const response = await fetch("/api/section-products/unsorted-count");
      const data = await response.json();
      if (data.success) {
        setUnsortedCount(data.count);
      }
    } catch (err) {
      console.error("Error loading unsorted count:", err);
    }
  };

  const loadSections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sections");
      const data = await response.json();

      if (data.success) {
        setAllSections(data.data || []);
        setError(null);
      } else {
        setError("База данных недоступна. Проверьте подключение.");
      }
    } catch (err) {
      setError("Не удалось загрузить данные. Проверьте подключение к базе данных.");
    } finally {
      setLoading(false);
    }
  };

  const loadUserSections = async () => {
    try {
      const response = await fetch("/api/user-sections");
      const data = await response.json();
      if (data.success) {
        setUserSectionIds(data.data.map((s: Section) => parseInt(s.id)));
      }
    } catch (err) {
      console.error("Error loading user sections:", err);
    }
  };

  const loadOrderSummary = async () => {
    try {
      const response = await fetch("/api/orders?limit=50");
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const orders = data.data as Order[];
        
        // 1. Check for Pending (Priority 1)
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length > 0) {
          const deptCounts: Record<string, number> = {};
          pendingOrders.forEach(o => {
            const dept = o.order_data.department || 'Unknown';
            const count = o.order_data.items?.length || 0;
            deptCounts[dept] = (deptCounts[dept] || 0) + count;
          });

          setOrderSummary({
            type: 'pending',
            count: pendingOrders.length,
            departments: deptCounts
          });
          return;
        }

        // 2. Check for In Transit (Priority 2)
        const transitOrders = orders.filter(o => o.status === 'sent');
        if (transitOrders.length > 0) {
          const supplierCounts: Record<string, number> = {};
          transitOrders.forEach(o => {
            o.order_data.items?.forEach(i => {
              if (i.supplier) {
                // Approximate item count per supplier
                supplierCounts[i.supplier] = (supplierCounts[i.supplier] || 0) + 1;
              }
            });
          });
          
          setOrderSummary({
            type: 'transit',
            count: transitOrders.length,
            suppliers: supplierCounts
          });
          return;
        }

        // 3. Fallback to Last Order (Priority 3)
        if (orders.length > 0) {
          setOrderSummary({
            type: 'last_order',
            count: 1,
            lastOrder: orders[0]
          });
        }
      }
    } catch (err) {
      console.error("Error loading orders:", err);
    }
  };

  const getPluralForm = (count: number, words: string[]) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5]];
  };

  const formatProductCount = (count: number) => {
    return `${count} ${getPluralForm(count, ["товар", "товара", "товаров"])}`;
  };

  const formatOrderCount = (count: number) => {
    return `${count} ${getPluralForm(count, ["заявка", "заявки", "заявок"])}`;
  };

  const formatDeliveryCount = (count: number) => {
    return `${count} ${getPluralForm(count, ["поставка", "поставки", "поставок"])}`;
  };

  const formatPos = (count: number) => {
    return `${count} ${getPluralForm(count, ["поз.", "поз.", "поз."])}`; // Short for positions
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Ожидает";
      case "sent": return "Отправлен";
      case "delivered": return "Доставлен";
      case "cancelled": return "Отменен";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatRelativeDate = (date: Date | string) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return "вчера";
    return orderDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const sections = (isAdmin || isManager)
    ? allSections
    : allSections.filter((section) => userSectionIds.includes(parseInt(section.id)));

  useEffect(() => {
    if (!loading && isStaff && sections.length === 1) {
      const section = sections[0];
      router.replace(`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`);
    }
  }, [loading, isStaff, sections, router]);

  const getSectionColors = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("кухня")) return "bg-orange-500 hover:bg-orange-600";
    if (lowerName.includes("бар")) return "bg-purple-500 hover:bg-purple-600";
    if (lowerName.includes("горничная")) return "bg-pink-500 hover:bg-pink-600";
    if (lowerName.includes("склад")) return "bg-gray-500 hover:bg-gray-600";
    if (lowerName.includes("офис")) return "bg-blue-500 hover:bg-blue-600";
    if (lowerName.includes("ресепшн")) return "bg-indigo-500 hover:bg-indigo-600";
    return "bg-teal-500 hover:bg-teal-600";
  };
  
  const getSectionIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("склад")) return "/icons/box.svg";
    if (lowerName.includes("бар")) return "/icons/martini.svg"; 
    if (lowerName.includes("хоз") || lowerName.includes("cleaning") || lowerName.includes("горничная")) return "/icons/broom.svg";
    if (lowerName.includes("кухня")) return "/icons/tableware.svg";
    return "/icons/tableware.svg";
  };

  const hasNoAssignedSections = !isAdmin && !isManager && !isDelivery && userSectionIds.length === 0 && allSections.length > 0;

  // === DYNAMIC STATUS CARD RENDERER ===
  const renderStatusCard = () => {
    if (!orderSummary) return null;

    if (orderSummary.type === 'pending') {
      const deptNames = orderSummary.departments 
        ? Object.keys(orderSummary.departments).join(", ")
        : "";

      return (
        <Link 
          href="/orders" 
          className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icons/list.svg" alt="Pending" className="w-9 h-9 opacity-70" />
              <div>
                <p className="text-xs text-yellow-700 flex items-center gap-2">
                  <span className="font-bold">{orderSummary.count} {orderSummary.count === 1 ? "заказ" : "заказа"}</span>
                  <span>•</span>
                  <span>Ожидают отправки</span>
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {deptNames}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      );
    }

    if (orderSummary.type === 'transit') {
      const supplierNames = orderSummary.suppliers
        ? Object.keys(orderSummary.suppliers).join(", ")
        : "";

      return (
        <Link 
          href="/orders" 
          className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icons/delivery.svg" alt="Transit" className="w-9 h-9 opacity-70" />
              <div>
                <p className="text-xs text-blue-700 flex items-center gap-2">
                  <span className="font-bold">{orderSummary.count} {orderSummary.count === 1 ? "поставка" : "поставки"}</span>
                  <span>•</span>
                  <span>В пути</span>
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {supplierNames}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      );
    }

    // Default: Last Order (History)
    if (orderSummary.type === 'last_order' && orderSummary.lastOrder) {
      const order = orderSummary.lastOrder;
      return (
        <Link 
          href="/orders" 
          className="w-full bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icons/box.svg" alt="Order" className="w-9 h-9 opacity-70" />
              <div>
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <span>•</span>
                  <span>{formatRelativeDate(order.created_at)}</span>
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  Последний заказ
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Restaurant Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {session?.user?.restaurantName || "Ресторан"}
          </h1>
          <p className="text-sm text-gray-500">Система управления закупками</p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Загрузка отделов...</p>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">
                Ошибка загрузки
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadSections}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
              >
                Попробовать снова
              </button>
            </div>
          ) : hasNoAssignedSections ? (
            <div className="col-span-full text-center py-8">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Нет доступных отделов
              </h3>
              <p className="text-gray-600 mb-4">
                Вам не назначены отделы. Обратитесь к администратору.
              </p>
            </div>
          ) : allSections.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <img src="/icons/box.svg" alt="Empty" className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Отделы не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Для текущего ресторана отделы не настроены
              </p>
              <div className="space-y-2">
                {process.env.NODE_ENV === 'development' && (
                  <Link
                    href="/dev/switch-restaurant"
                    className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg"
                  >
                    Dev: Выбрать другой ресторан
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Dynamic Priority Status Card */}
              {renderStatusCard()}

              {/* Suppliers Section - Only for admin/manager */}
              {(isAdmin || isManager) && (
                <Link
                  href="/suppliers-categories"
                  className="relative w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start overflow-hidden group"
                >
                  <img src="/icons/box.svg" alt="Suppliers" className="w-8 h-8 md:w-10 md:h-10 mr-3 md:mr-4 invert brightness-0 filter group-hover:scale-110 transition-transform" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base md:text-lg">Поставщики и ингредиенты</div>
                    {unsortedCount !== null && unsortedCount > 0 && (
                      <div className="mt-1.5 inline-flex items-center bg-red-500 text-white text-xs px-2 py-0.5 rounded shadow-sm">
                        {unsortedCount} {getPluralForm(unsortedCount, ["товар без поставщика", "товара без поставщика", "товаров без поставщика"])}
                      </div>
                    )}
                  </div>
                </Link>
              )}

              {/* Dynamic Sections - Filtered by user assignments */}
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`}
                  className={`w-full ${getSectionColors(section.name)} active:opacity-90 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start`}
                >
                  <img 
                    src={getSectionIcon(section.name)} 
                    alt={section.name} 
                    className="w-8 h-8 md:w-10 md:h-10 mr-3 md:mr-4 invert brightness-0 filter" 
                  />
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">{section.name}</div>
                    <div className="text-xs md:text-sm opacity-90">
                      {formatProductCount(section.custom_products_count || 0)}
                    </div>
                  </div>
                </Link>
              ))}

            </>
          )}
        </div>


      </div>

    </div>
  );
}
