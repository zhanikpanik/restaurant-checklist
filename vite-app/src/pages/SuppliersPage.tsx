import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/store/useStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';
import type { Supplier, ProductCategory } from '@/types';

export default function SuppliersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const restaurant = useRestaurant();
  const toast = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isAuthorized = !authLoading && user && ['admin', 'manager'].includes(user.role);

  // Role-based access control
  useEffect(() => {
    if (!authLoading && (!user || !['admin', 'manager'].includes(user.role))) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, categoriesRes] = await Promise.all([
        api.get<Supplier[]>('/api/suppliers'),
        api.get<ProductCategory[]>('/api/categories'),
      ]);

      if (suppliersRes.success) setSuppliers(suppliersRes.data || []);
      if (categoriesRes.success) setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  const handleSyncSuppliers = async () => {
    setSyncing(true);
    try {
      const response = await api.get('/api/sync-suppliers');
      if (response.success) {
        toast.success(`Синхронизировано ${response.data.syncedCount} поставщиков из Poster`);
        loadData();
      } else {
        toast.error(response.error || 'Ошибка синхронизации поставщиков');
      }
    } catch (error) {
      console.error('Error syncing suppliers:', error);
      toast.error('Ошибка синхронизации с Poster');
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader 
        title="🏢 Поставщики" 
        rightContent={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSyncSuppliers}
              disabled={syncing}
              variant="primary"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Синхронизация...
                </>
              ) : (
                <>🔄 Синхронизировать из Poster</>
              )}
            </Button>
            <span className="text-sm font-medium text-gray-600">
              {restaurant.current?.name}
            </span>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Загрузка поставщиков...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{supplier.name}</h3>
                    {supplier.poster_supplier_id && (
                      <p className="text-xs text-blue-600 mt-1">
                        ✓ Связан с Poster (ID: {supplier.poster_supplier_id})
                      </p>
                    )}
                  </div>
                </div>
                
                {supplier.phone && (
                  <p className="text-sm text-gray-600 mt-2">
                    📞 {supplier.phone}
                  </p>
                )}
                
                {supplier.contact_info && (
                  <p className="text-sm text-gray-500 mt-1">
                    {supplier.contact_info}
                  </p>
                )}
                
                {supplier.categories_count !== undefined && (
                  <p className="text-xs text-gray-400 mt-3">
                    Категорий: {supplier.categories_count}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && suppliers.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-xl font-semibold text-gray-700 mb-2">Нет поставщиков</p>
            <p className="text-gray-500 mb-4">Синхронизируйте поставщиков из Poster</p>
            <Button onClick={handleSyncSuppliers} disabled={syncing}>
              🔄 Синхронизировать из Poster
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
