"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { GenericProductListTab } from "@/components/manager/UnsortedTab";
import { useToast } from "@/components/ui/Toast";
import type { Supplier, Product } from "@/types";

type TabType = "suppliers" | "unsorted";

export default function SuppliersCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | number>("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  
  // Cache all products to avoid refetching
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Role-based access control - redirect unauthorized users
  const isAuthorized = status === "authenticated" && ["admin", "manager"].includes(session?.user?.role || "");

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "authenticated" && !["admin", "manager"].includes(session?.user?.role || "")) {
      router.replace("/");
    }
  }, [session, status, router]);

  // Load unassigned count initially and when data reloads
  useEffect(() => {
    if (isAuthorized && productsLoaded) {
      const count = allProducts.filter((p: Product) => !p.supplier_id).length;
      setUnassignedCount(count);
    }
  }, [isAuthorized, allProducts, productsLoaded]); 

  // Load data when tab changes
  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [selectedSupplierId, isAuthorized]);

  // Show loading while checking auth
  if (status === "loading" || !isAuthorized) {
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
      // Always load suppliers for the tabs
      const suppliersRes = await fetch("/api/suppliers");
      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) setSuppliers(suppliersData.data);

      // Load all products once and cache them
      if (!productsLoaded) {
        const productsRes = await fetch("/api/section-products?active=true");
        const productsData = await productsRes.json();
        if (productsData.success) {
          setAllProducts(productsData.data);
          setProductsLoaded(true);
        }
      }

      // Filter from cache instead of fetching again
      if (selectedSupplierId === "suppliers") {
        // Just showing the list of suppliers (default view)
      } else if (selectedSupplierId === "unsorted") {
        const unassigned = allProducts.filter((p: Product) => !p.supplier_id);
        setUnassignedProducts(unassigned);
      } else {
        // Filter products for specific supplier from cache
        const filtered = allProducts.filter((p: Product) => p.supplier_id === Number(selectedSupplierId));
        setSupplierProducts(filtered);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // 1. Sync Suppliers
      const suppliersRes = await fetch("/api/poster/sync-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const suppliersData = await suppliersRes.json();
      
      if (!suppliersData.success) {
        throw new Error(suppliersData.error || "Ошибка синхронизации поставщиков");
      }

      // 2. Sync Ingredients/Sections
      const ingredientsRes = await fetch("/api/sync-sections");
      const ingredientsData = await ingredientsRes.json();

      if (!ingredientsData.success) {
        throw new Error(ingredientsData.error || "Ошибка синхронизации ингредиентов");
      }

      // Success
      const { syncedCount, ingredientsSynced } = ingredientsData.data;
      toast.success(`Синхронизировано: поставщики, ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);
      
      // Clear cache and reload
      setProductsLoaded(false);
      loadData();
    } catch (error: any) {
      console.error("Error syncing:", error);
      toast.error(error.message || "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-between mb-4">
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900">Поставщики</h1>
            
            <div className="w-10" />
          </div>

          {/* Scrollable Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedSupplierId("suppliers")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedSupplierId === "suppliers"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🏢 Все поставщики
            </button>
            
            <button
              onClick={() => setSelectedSupplierId("unsorted")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedSupplierId === "unsorted"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              📦 Нераспределенные
              {unassignedCount > 0 && (
                <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {unassignedCount}
                </span>
              )}
            </button>

            {suppliers.map(supplier => (
              <button
                key={supplier.id}
                onClick={() => setSelectedSupplierId(supplier.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedSupplierId === supplier.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {supplier.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {selectedSupplierId === "suppliers" && (
          <SuppliersTab
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            loading={loading}
            onReload={loadData}
          />
        )}

        {selectedSupplierId === "unsorted" && (
          <GenericProductListTab
            products={unassignedProducts}
            suppliers={suppliers}
            onReload={loadData}
            title="Нераспределенные товары"
          />
        )}

        {typeof selectedSupplierId === 'number' && (
          <GenericProductListTab
            products={supplierProducts}
            suppliers={suppliers}
            onReload={loadData}
            title={`Товары: ${suppliers.find(s => s.id === selectedSupplierId)?.name}`}
          />
        )}
      </main>

      {/* Floating Sync Button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50"
        title="Синхронизировать все данные"
      >
        {syncing ? (
          <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <span className="text-2xl">🔄</span>
        )}
      </button>
    </div>
  );
}
