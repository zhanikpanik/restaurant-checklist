import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/store/useStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { OrdersTab } from '@/components/manager/OrdersTab';
import { CategoriesTab } from '@/components/manager/CategoriesTab';
import { SuppliersTab } from '@/components/manager/SuppliersTab';
import { DepartmentsTab } from '@/components/manager/DepartmentsTab';
import { ProductsTab } from '@/components/manager/ProductsTab';
import { UsersTab } from '@/components/manager/UsersTab';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import type { Order, Supplier, ProductCategory, Product, Section } from '@/types';

type TabType = 'orders' | 'categories' | 'suppliers' | 'departments' | 'products' | 'users';

const TABS = [
  { id: 'orders', label: 'Заказы', icon: '📋' },
  { id: 'categories', label: 'Категории', icon: '🏷️' },
  { id: 'suppliers', label: 'Поставщики', icon: '🏢' },
  { id: 'departments', label: 'Отделы', icon: '🏪' },
  { id: 'products', label: 'Товары', icon: '📦' },
  { id: 'users', label: 'Пользователи', icon: '👥' },
];

export default function ManagerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const restaurant = useRestaurant();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isAuthorized = !authLoading && user && ['admin', 'manager'].includes(user.role);

  // Role-based access control
  useEffect(() => {
    if (!authLoading && (!user || !['admin', 'manager'].includes(user.role))) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Load form data on mount
  useEffect(() => {
    if (!isAuthorized) return;

    const loadFormData = async () => {
      try {
        const [sectionsRes, categoriesRes, suppliersRes] = await Promise.all([
          api.get<Section[]>('/api/sections'),
          api.get<ProductCategory[]>('/api/categories'),
          api.get<Supplier[]>('/api/suppliers'),
        ]);

        if (sectionsRes.success) setSections(sectionsRes.data || []);
        if (categoriesRes.success) setCategories(categoriesRes.data || []);
        if (suppliersRes.success) setSuppliers(suppliersRes.data || []);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    };
    loadFormData();
  }, [isAuthorized]);

  // Load tab-specific data
  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [activeTab, isAuthorized]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'orders': {
          const res = await api.get<Order[]>('/api/orders?all=true');
          if (res.success) setOrders(res.data || []);
          break;
        }
        case 'suppliers': {
          const res = await api.get<Supplier[]>('/api/suppliers');
          if (res.success) setSuppliers(res.data || []);
          break;
        }
        case 'categories': {
          const res = await api.get<ProductCategory[]>('/api/categories');
          if (res.success) setCategories(res.data || []);
          break;
        }
        case 'products': {
          const res = await api.get<Product[]>('/api/section-products');
          if (res.success) setProducts(res.data || []);
          break;
        }
        case 'departments': {
          const res = await api.get<Section[]>('/api/sections');
          if (res.success) setSections(res.data || []);
          break;
        }
        case 'users': {
          const res = await api.get<any[]>('/api/users?include_sections=true');
          if (res.success) setUsers(res.data || []);
          break;
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromPoster = async () => {
    try {
      setSyncing(true);
      const response = await api.get<{ syncedCount: number; ingredientsSynced: number }>('/api/sync-sections');

      if (response.success && response.data) {
        const { syncedCount, ingredientsSynced } = response.data;
        toast.success(`Синхронизировано: ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);
        loadData();
      } else {
        toast.error(response.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      console.error('Error syncing from Poster:', error);
      toast.error('Ошибка синхронизации с Poster');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="👨‍💼 Панель менеджера"
        rightContent={
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleSyncFromPoster}
              disabled={syncing}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-w-[40px] md:min-w-0"
              title="Синхронизировать из Poster"
            >
              {syncing ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>🔄</span>
                  <span className="hidden md:inline">Синхронизировать</span>
                </>
              )}
            </button>
            <span className="hidden md:inline text-gray-400">|</span>
            <span className="hidden md:inline">{restaurant.current?.name || 'Ресторан'}</span>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              setOrders={setOrders}
              suppliers={suppliers}
              products={products}
              loading={loading}
              restaurantName={restaurant.current?.name || 'Ресторан'}
              onReload={loadData}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              setCategories={setCategories}
              suppliers={suppliers}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsTab
              sections={sections}
              setSections={setSections}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === 'products' && (
            <ProductsTab
              products={products}
              setProducts={setProducts}
              sections={sections}
              categories={categories}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              setUsers={setUsers}
              sections={sections}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
