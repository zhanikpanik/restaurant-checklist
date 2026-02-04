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

// Common emoji options for departments
const EMOJI_OPTIONS = ["🍳", "🍺", "🧹", "📦", "🏪", "🍕", "☕", "🥗", "🧊", "🛒"];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [userSectionIds, setUserSectionIds] = useState<number[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  // Department modal state
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ name: "", emoji: "🍳" });
  const [submitting, setSubmitting] = useState(false);
  
  const isAdmin = session?.user?.role === "admin";
  const isManager = session?.user?.role === "manager";
  const isDelivery = session?.user?.role === "delivery";

  // Load sections when session is available
  useEffect(() => {
    if (status === "authenticated") {
      loadSections();
      loadUserSections();
      loadLastOrder();
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

  const handleSyncFromPoster = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/sync-sections");
      const data = await response.json();

      if (data.success) {
        const { syncedCount, ingredientsSynced } = data.data;
        toast.success(`Синхронизировано: ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);
        loadSections();
      } else {
        toast.error(data.error || "Ошибка синхронизации");
      }
    } catch (error) {
      console.error("Error syncing from Poster:", error);
      toast.error("Ошибка синхронизации с Poster");
    } finally {
      setSyncing(false);
    }
  };

  const loadLastOrder = async () => {
    try {
      const response = await fetch("/api/orders?my=true&limit=1");
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setLastOrder(data.data[0]);
      }
    } catch (err) {
      console.error("Error loading last order:", err);
    }
  };

  const handleCreateDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toast.error("Введите название отдела");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: departmentForm.name.trim(),
          emoji: departmentForm.emoji,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Отдел создан");
        setShowDepartmentModal(false);
        setDepartmentForm({ name: "", emoji: "🍳" });
        loadSections();
      } else {
        toast.error(data.error || "Ошибка создания отдела");
      }
    } catch (error) {
      toast.error("Ошибка создания отдела");
    } finally {
      setSubmitting(false);
    }
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

  // Filter sections based on user assignments
  // Admin and Manager see all sections
  // Staff/delivery see only assigned sections
  const sections = (isAdmin || isManager)
    ? allSections
    : allSections.filter((section) => userSectionIds.includes(parseInt(section.id)));

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

  const getSectionDescription = (name: string, posterStorageId?: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("кухня")) return "Заказы для кухни";
    if (lowerName.includes("бар")) return "Заказы для бара";
    if (lowerName.includes("горничная")) return "Хозяйственные товары";
    if (posterStorageId) return "Товары из Poster";
    return "Управление товарами";
  };

  // Show message for staff with no assigned sections
  // Delivery users don't need sections - they only access /delivery
  const hasNoAssignedSections = !isAdmin && !isManager && !isDelivery && userSectionIds.length === 0 && allSections.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 md:p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-4 md:p-8">
        {/* Header with Action Buttons for Admin/Manager */}
        {(isAdmin || isManager) && (
          <div className="flex items-center justify-end gap-2 mb-4">
            <button
              onClick={handleSyncFromPoster}
              disabled={syncing}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Синхронизировать из Poster"
            >
              {syncing ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>🔄</span>
                  <span className="hidden sm:inline">Синхронизировать</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:gap-4">
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
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Отделы не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Для текущего ресторана отделы не настроены
              </p>
              <div className="space-y-2">
                <Link
                  href="/manager"
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                >
                  Перейти в панель менеджера
                </Link>
                <br />
                {process.env.NODE_ENV === 'development' && (
                  <Link
                    href="/dev/switch-restaurant"
                    className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg"
                  >
                    🔧 Dev: Выбрать другой ресторан
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Last Order Card - Show for all authenticated users */}
              {lastOrder && (
                <div className="w-full bg-white border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">📋 Последний заказ</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lastOrder.status)}`}>
                      {getStatusLabel(lastOrder.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{lastOrder.order_data.department}</span>
                    <span className="mx-2">•</span>
                    <span>{lastOrder.order_data.items?.length || 0} товаров</span>
                    <span className="mx-2">•</span>
                    <span>{formatRelativeDate(lastOrder.created_at)}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mb-3">
                    {lastOrder.order_data.items?.slice(0, 3).map(item => item.name).join(", ")}
                    {(lastOrder.order_data.items?.length || 0) > 3 && "..."}
                  </div>
                  <Link
                    href="/orders"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                  >
                    Все заказы
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

              {/* Suppliers Section - Only for admin/manager */}
              {(isAdmin || isManager) && (
                <Link
                  href="/suppliers-categories"
                  className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start"
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">🏢</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Поставщики</div>
                    <div className="text-xs md:text-sm opacity-90">
                      Управление поставщиками и категориями
                    </div>
                  </div>
                </Link>
              )}

              {/* Delivery/Orders Section - Removed per user request */}

              {/* Dynamic Sections - Filtered by user assignments */}
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`}
                  className={`w-full ${getSectionColors(section.name)} active:opacity-90 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start`}
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">{section.emoji}</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">{section.name}</div>
                    <div className="text-xs md:text-sm opacity-90">
                      {getSectionDescription(section.name, section.poster_storage_id)}
                      {section.custom_products_count
                        ? ` • ${section.custom_products_count} товаров`
                        : ""}
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create Department Button - Only for admin/manager */}
              {(isAdmin || isManager) && (
                <button
                  onClick={() => setShowDepartmentModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 text-gray-500 hover:text-gray-600 font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-all duration-200 flex items-center justify-start"
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">➕</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Создать отдел</div>
                    <div className="text-xs md:text-sm opacity-75">
                      Добавить новый отдел
                    </div>
                  </div>
                </button>
              )}
            </>
          )}
        </div>

        <div className="mt-6 md:mt-8 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            Система управления рестораном
          </p>
        </div>
      </div>

      {/* Create Department Modal */}
      <BottomSheet
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title="Создать отдел"
      >
        <FormInput
          label="Название отдела"
          value={departmentForm.name}
          onChange={(value) => setDepartmentForm({ ...departmentForm, name: value })}
          placeholder="Например: Кухня"
        />
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Иконка
          </label>
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDepartmentForm({ ...departmentForm, emoji })}
                className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                  departmentForm.emoji === emoji
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <FormButton onClick={handleCreateDepartment} loading={submitting}>
          Создать отдел
        </FormButton>
      </BottomSheet>
    </div>
  );
}
