import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import type { Section } from '@/types';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [userSectionIds, setUserSectionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isDelivery = user?.role === 'delivery';

  useEffect(() => {
    if (!authLoading && user) {
      loadSections();
      loadUserSections();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadSections = async () => {
    try {
      setLoading(true);
      const response = await api.get<Section[]>('/api/sections');

      if (response.success) {
        setAllSections(response.data || []);
        setError(null);
      } else {
        setError('База данных недоступна. Проверьте подключение.');
      }
    } catch (err) {
      setError('Не удалось загрузить данные. Проверьте подключение к базе данных.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSections = async () => {
    try {
      const response = await api.get<Section[]>('/api/user-sections');
      if (response.success && response.data) {
        setUserSectionIds(response.data.map((s) => s.id));
      }
    } catch (err) {
      console.error('Error loading user sections:', err);
    }
  };

  // Filter sections based on user assignments
  const sections = (isAdmin || isManager)
    ? allSections
    : allSections.filter((section) => userSectionIds.includes(section.id));

  const getSectionColors = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('кухня')) return 'bg-orange-500 hover:bg-orange-600';
    if (lowerName.includes('бар')) return 'bg-purple-500 hover:bg-purple-600';
    if (lowerName.includes('горничная')) return 'bg-pink-500 hover:bg-pink-600';
    if (lowerName.includes('склад')) return 'bg-gray-500 hover:bg-gray-600';
    if (lowerName.includes('офис')) return 'bg-blue-500 hover:bg-blue-600';
    if (lowerName.includes('ресепшн')) return 'bg-indigo-500 hover:bg-indigo-600';
    return 'bg-teal-500 hover:bg-teal-600';
  };

  const getSectionDescription = (name: string, posterStorageId?: number) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('кухня')) return 'Заказы для кухни';
    if (lowerName.includes('бар')) return 'Заказы для бара';
    if (lowerName.includes('горничная')) return 'Хозяйственные товары';
    if (posterStorageId) return 'Товары из Poster';
    return 'Управление товарами';
  };

  const hasNoAssignedSections = !isAdmin && !isManager && !isDelivery && userSectionIds.length === 0 && allSections.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 md:p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-4 md:p-8">
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
            </div>
          ) : (
            <>
              {/* Manager Section - Only for admin/manager */}
              {(isAdmin || isManager) && (
                <>
                <Link
                  to="/orders"
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start shadow-md transform hover:scale-[1.01]"
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">📦</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Управление Заказами</div>
                    <div className="text-xs md:text-sm opacity-90">
                      Сборка, отправка и прием заказов
                    </div>
                  </div>
                </Link>

                <Link
                  to="/suppliers"
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start shadow-md transform hover:scale-[1.01]"
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">🏢</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Поставщики</div>
                    <div className="text-xs md:text-sm opacity-90">
                      Синхронизация с Poster
                    </div>
                  </div>
                </Link>
                </>
              )}

              {/* Delivery Section - Only for admin/manager/delivery */}
              {(isAdmin || isManager || isDelivery) && (
                <Link
                  to="/delivery"
                  className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start"
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">🚚</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">Доставка</div>
                    <div className="text-xs md:text-sm opacity-90">
                      Мои заказы и отслеживание
                    </div>
                  </div>
                </Link>
              )}

              {/* Dynamic Sections */}
              {sections.map((section) => (
                <Link
                  key={section.id}
                  to={`/custom?section_id=${section.id}&dept=${encodeURIComponent(section.name)}`}
                  className={`w-full ${getSectionColors(section.name)} active:opacity-90 text-white font-medium py-4 px-4 md:py-6 md:px-6 rounded-lg transition-colors duration-200 flex items-center justify-start`}
                >
                  <span className="text-2xl md:text-3xl mr-3 md:mr-4">{section.emoji}</span>
                  <div className="text-left">
                    <div className="font-semibold text-base md:text-lg">{section.name}</div>
                    <div className="text-xs md:text-sm opacity-90">
                      {getSectionDescription(section.name, section.poster_storage_id)}
                      {section.custom_products_count
                        ? ` • ${section.custom_products_count} товаров`
                        : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="mt-6 md:mt-8 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            Система управления рестораном
          </p>
        </div>
      </div>
    </div>
  );
}
