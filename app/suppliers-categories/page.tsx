"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { GenericProductListTab } from "@/components/manager/UnsortedTab";
import { PosterSyncPanel } from "@/components/poster/PosterSyncPanel";
import { useToast } from "@/components/ui/Toast";
import { useCSRF } from "@/hooks/useCSRF";
import type { Supplier, Product } from "@/types";

type TabType = "suppliers" | "unsorted";

export default function SuppliersCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { fetchWithCSRF } = useCSRF();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | number>("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [relatedIdsMap, setRelatedIdsMap] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  
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

      // Always refetch products when explicitly requested (e.g., after assignment)
      const productsRes = await fetch("/api/section-products?active=true");
      const productsData = await productsRes.json();
      if (productsData.success) {
        setAllProducts(productsData.data);
        setProductsLoaded(true);
      }

      // Filter from cache instead of fetching again
      if (selectedSupplierId === "suppliers") {
        // Just showing the list of suppliers (default view)
      } else if (selectedSupplierId === "unsorted") {
        const unassigned = productsData.data.filter((p: Product) => !p.supplier_id);
        
        // Group by poster_ingredient_id to avoid duplicates in the UI
        // This ensures one entry per ingredient, even if it exists in multiple sections
        const groupedMap = new Map<string, Product>();
        const idMap: Record<number, number[]> = {};

        unassigned.forEach((p: Product) => {
          const key = p.poster_ingredient_id || `local_${p.id}`; 
          
          if (!groupedMap.has(key)) {
            // First time seeing this ingredient
            groupedMap.set(key, { ...p }); 
            // Initialize mapping for this representative ID
            idMap[p.id] = [p.id];
          } else {
            // Duplicate found (same ingredient in another section)
            const existing = groupedMap.get(key)!;
            
            // Aggregate quantity
            existing.quantity = (Number(existing.quantity) || 0) + (Number(p.quantity) || 0);
            
            // Append section name
            if (p.section_name && !existing.section_name?.includes(p.section_name)) {
                existing.section_name = existing.section_name 
                  ? `${existing.section_name}, ${p.section_name}` 
                  : p.section_name;
            }
            
            // Link this duplicate ID to the representative ID
            if (idMap[existing.id]) {
                idMap[existing.id].push(p.id);
            }
          }
        });

        setUnassignedProducts(Array.from(groupedMap.values()));
        setRelatedIdsMap(idMap);
      } else {
        // Filter products for specific supplier from fresh data
        const filtered = productsData.data.filter((p: Product) => p.supplier_id === Number(selectedSupplierId));
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
      const suppliersRes = await fetchWithCSRF("/api/poster/sync-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (!suppliersRes.ok) {
        const errorText = await suppliersRes.text();
        console.error("Sync suppliers HTTP error:", suppliersRes.status, errorText);
        throw new Error(`HTTP ${suppliersRes.status}: ${errorText.substring(0, 200)}`);
      }
      
      const suppliersData = await suppliersRes.json();
      console.log("Suppliers sync response:", suppliersData);
      
      if (!suppliersData.success) {
        console.error("Suppliers sync failed:", suppliersData.error);
        throw new Error(suppliersData.error || "Ошибка синхронизации поставщиков");
      }

      // 2. Sync Ingredients/Sections - ALSO USE CSRF
      const ingredientsRes = await fetchWithCSRF("/api/sync-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      // Check if response is ok before parsing JSON
      if (!ingredientsRes.ok) {
        const errorText = await ingredientsRes.text();
        console.error("Sync ingredients HTTP error:", ingredientsRes.status, errorText);
        throw new Error(`HTTP ${ingredientsRes.status}: ${errorText.substring(0, 200)}`);
      }
      
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

      {/* Sync Panel Toggle */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <button
          onClick={() => setShowSyncPanel(!showSyncPanel)}
          className="w-full flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <span className="font-medium text-gray-900">Poster Sync Settings</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              showSyncPanel ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showSyncPanel && (
          <div className="mt-4">
            <PosterSyncPanel />
          </div>
        )}
      </div>

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
            relatedIdsMap={relatedIdsMap}
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
