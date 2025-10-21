"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Section {
  id: string;
  name: string;
  emoji: string;
  poster_storage_id?: string;
  custom_products_count?: number;
}

interface Restaurant {
  id: string;
  name: string;
  logo?: string;
}

export default function HomePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string>("unknown");
  const [tenantName, setTenantName] = useState<string>("Загрузка...");
  const router = useRouter();

  useEffect(() => {
    loadTenantInfo();
    loadSections();
  }, []);

  const getCurrentTenant = () => {
    const cookies = document.cookie.split(";");
    const restaurantCookie = cookies.find((c) => c.trim().startsWith("restaurant_id="));
    return restaurantCookie ? restaurantCookie.split("=")[1].trim() : "unknown";
  };

  const loadTenantInfo = async () => {
    const tenant = getCurrentTenant();
    setCurrentTenant(tenant);
    setTenantName(tenant);

    try {
      const response = await fetch("/api/restaurants");
      const data = await response.json();
      if (data.success) {
        const restaurant = data.data.find((r: Restaurant) => r.id === tenant);
        if (restaurant) {
          setTenantName(`${restaurant.logo || "🍽️"} ${restaurant.name}`);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurant info:", error);
    }
  };

  const loadSections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sections");
      const data = await response.json();

      if (data.success) {
        setSections(data.data || []);
        setError(null);
      } else {
        // If database is not available, show a friendly message
        setError("База данных недоступна. Проверьте подключение.");
      }
    } catch (err) {
      setError("Не удалось загрузить данные. Проверьте подключение к базе данных.");
    } finally {
      setLoading(false);
    }
  };

  const syncSections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sync-sections");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      await loadSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync sections");
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        {/* Current Restaurant Indicator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-800">
                Текущий ресторан:
              </span>
              <span className="text-sm text-blue-600 font-semibold">
                {tenantName}
              </span>
            </div>
            <Link
              href="/select-restaurant"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Изменить
            </Link>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🍽️ Restaurant System
          </h1>
          <p className="text-gray-600">Выберите отдел для работы</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          ) : sections.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Отделы не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                Для текущего ресторана отделы не настроены
              </p>
              <div className="space-y-2">
                <button
                  onClick={syncSections}
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                >
                  Синхронизировать отделы из Poster
                </button>
                <br />
                <Link
                  href="/select-restaurant"
                  className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  Выбрать другой ресторан
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Manager Section */}
              <Link
                href="/manager"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-6 px-6 rounded-lg transition-colors duration-200 flex items-center justify-start"
              >
                <span className="text-3xl mr-4">👨‍💼</span>
                <div className="text-left">
                  <div className="font-semibold text-lg">Менеджер</div>
                  <div className="text-sm opacity-90">
                    Управление заказами и поставщиками
                  </div>
                </div>
              </Link>

              {/* Delivery Section */}
              <Link
                href="/delivery"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-6 px-6 rounded-lg transition-colors duration-200 flex items-center justify-start"
              >
                <span className="text-3xl mr-4">🚚</span>
                <div className="text-left">
                  <div className="font-semibold text-lg">Доставка</div>
                  <div className="text-sm opacity-90">
                    Мои заказы и отслеживание
                  </div>
                </div>
              </Link>

              {/* Dynamic Sections */}
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`}
                  className={`w-full ${getSectionColors(section.name)} text-white font-medium py-6 px-6 rounded-lg transition-colors duration-200 flex items-center justify-start`}
                >
                  <span className="text-3xl mr-4">{section.emoji}</span>
                  <div className="text-left">
                    <div className="font-semibold text-lg">{section.name}</div>
                    <div className="text-sm opacity-90">
                      {getSectionDescription(section.name, section.poster_storage_id)}
                      {section.custom_products_count
                        ? ` • ${section.custom_products_count} товаров`
                        : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Система управления рестораном
          </p>
        </div>
      </div>
    </div>
  );
}