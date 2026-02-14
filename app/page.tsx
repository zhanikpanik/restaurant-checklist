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
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

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
      const deptDetails = orderSummary.departments 
        ? Object.entries(orderSummary.departments).map(([name, count]) => `${name} ${count}`).join(", ")
        : "";
      
      const totalItems = orderSummary.departments 
        ? Object.values(orderSummary.departments).reduce((a, b) => a + b, 0) 
        : 0;

      return (
        <Link 
          href="/orders" 
          className="w-full bg-white border border-yellow-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative flex items-center"
        >
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center mr-4">
            <img src="/icons/list.svg" alt="Pending" className="w-10 h-10 opacity-80" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-yellow-600">
                Ожидают отправки
              </span>
            </div>
            <h3 className="font-bold text-gray-900 leading-tight truncate">
              {deptDetails}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              Всего {formatProductCount(totalItems)}
            </p>
          </div>
          {/* Arrow */}
          <div className="ml-2 text-gray-300 group-hover:text-yellow-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>
      );
    }

    if (orderSummary.type === 'transit') {
      const supplierDetails = orderSummary.suppliers
        ? Object.entries(orderSummary.suppliers).map(([name, count]) => name).join(" • ")
        : "";
        
      const totalItems = orderSummary.suppliers 
        ? Object.values(orderSummary.suppliers).reduce((a, b) => a + b, 0) 
        : 0;

      return (
        <Link 
          href="/orders" 
          className="w-full bg-white border border-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative flex items-center"
        >
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center mr-4">
            <img src="/icons/delivery.svg" alt="Transit" className="w-10 h-10 opacity-80" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                В пути
              </span>
            </div>
            <h3 className="font-bold text-gray-900 leading-tight">
              {orderSummary.count === 1 ? "Ожидается 1 поставка" : `Ожидается ${orderSummary.count} ${getPluralForm(orderSummary.count, ["поставка", "поставки", "поставок"])}`}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {supplierDetails} • {formatProductCount(totalItems)}
            </p>
          </div>
          {/* Arrow */}
          <div className="ml-2 text-gray-300 group-hover:text-blue-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
          className="w-full bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative flex items-center"
        >
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Последний заказ
              </span>
              <span className="text-xs text-gray-400">• {formatRelativeDate(order.created_at)}</span>
            </div>
            <h3 className="font-bold text-gray-900 leading-tight">
              {order.order_data.department}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {order.order_data.items?.map(item => item.name).join(", ")}
            </p>
          </div>
          {/* Arrow */}
          <div className="ml-2 text-gray-300 group-hover:text-purple-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                  className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start"
                >
                  <img src="/icons/box.svg" alt="Suppliers" className="w-8 h-8 md:w-10 md:h-10 mr-3 md:mr-4 invert brightness-0 filter" />
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Поставщики и ингредиенты</div>
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
