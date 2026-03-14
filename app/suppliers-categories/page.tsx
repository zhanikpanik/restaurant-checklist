"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { GenericProductListTab } from "@/components/manager/UnsortedTab";
import { useToast } from "@/components/ui/Toast";
import { useCSRF } from "@/hooks/useCSRF";
import type { Supplier, Product } from "@/types";

export default function SuppliersCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { fetchWithCSRF } = useCSRF();
  
  // "suppliers", "unsorted", or a supplier ID (number)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | number>("suppliers");
  
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [relatedIdsMap, setRelatedIdsMap] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Cache all products to avoid refetching
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Role-based access control - redirect unauthorized users
  const isAuthorized =
    status === "authenticated" &&
    ["admin", "manager"].includes(session?.user?.role || "");

  useEffect(() => {
    if (status === "loading") return;

    if (
      status === "authenticated" &&
      !["admin", "manager"].includes(session?.user?.role || "")
    ) {
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

  const loadData = async () => {
    setLoading(true);
    try {
      // Always load suppliers for the tabs
      const suppliersRes = await fetch("/api/suppliers");
      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) setSuppliers(suppliersData.data);

      // Always refetch products when explicitly requested
      const productsRes = await fetch("/api/section-products?active=true");
      const productsData = await productsRes.json();
      if (productsData.success) {
        setAllProducts(productsData.data);
        setProductsLoaded(true);
      }

      if (selectedSupplierId === "unsorted") {
        const unassigned = productsData.data.filter(
          (p: Product) => !p.supplier_id,
        );

        const groupedMap = new Map<string, Product>();
        const idMap: Record<number, number[]> = {};

        unassigned.forEach((p: Product) => {
          const key = p.poster_ingredient_id || `local_${p.id}`;

          if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...p });
            idMap[p.id] = [p.id];
          } else {
            const existing = groupedMap.get(key)!;
            existing.quantity = (Number(existing.quantity) || 0) + (Number(p.quantity) || 0);

            if (p.section_name && !existing.section_name?.includes(p.section_name)) {
              existing.section_name = existing.section_name
                ? `${existing.section_name}, ${p.section_name}`
                : p.section_name;
            }

            if (idMap[existing.id]) {
              idMap[existing.id].push(p.id);
            }
          }
        });

        setUnassignedProducts(Array.from(groupedMap.values()));
        setRelatedIdsMap(idMap);
      } else if (typeof selectedSupplierId === "number") {
        const filtered = productsData.data.filter(
          (p: Product) => p.supplier_id === Number(selectedSupplierId),
        );
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
      const suppliersRes = await fetchWithCSRF("/api/poster/sync-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!suppliersRes.ok) throw new Error(`HTTP ${suppliersRes.status}`);

      const suppliersData = await suppliersRes.json();
      if (!suppliersData.success) throw new Error(suppliersData.error || "Ошибка синхронизации поставщиков");

      const ingredientsRes = await fetchWithCSRF("/api/sync-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!ingredientsRes.ok) throw new Error(`HTTP ${ingredientsRes.status}`);

      const ingredientsData = await ingredientsRes.json();
      if (!ingredientsData.success) throw new Error(ingredientsData.error || "Ошибка синхронизации ингредиентов");

      const { syncedCount, ingredientsSynced } = ingredientsData.data;
      toast.success(`Синхронизировано: поставщики, ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);

      setProductsLoaded(false);
      loadData();
    } catch (error: any) {
      console.error("Error syncing:", error);
      toast.error(error.message || "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  // Global Search Filtering
  const searchedProducts = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    
    // Create a deduplicated view for search (like we did for unsorted) so we don't assign 3 copies of "Milk"
    const lowerQuery = globalSearchQuery.toLowerCase();
    const matched = allProducts.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.section_name && p.section_name.toLowerCase().includes(lowerQuery)) ||
      (p.category_name && p.category_name.toLowerCase().includes(lowerQuery))
    );

    const groupedMap = new Map<string, Product>();
    
    matched.forEach((p: Product) => {
      const key = p.poster_ingredient_id || `local_${p.id}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, { ...p });
      } else {
        const existing = groupedMap.get(key)!;
        if (p.section_name && !existing.section_name?.includes(p.section_name)) {
          existing.section_name = existing.section_name
            ? `${existing.section_name}, ${p.section_name}`
            : p.section_name;
        }
      }
    });

    return Array.from(groupedMap.values());
  }, [allProducts, globalSearchQuery]);

  // Compute a global relatedIdsMap to ensure assigning a grouped product assigns all its instances
  const globalRelatedIdsMap = useMemo(() => {
    if (!globalSearchQuery.trim()) return {};
    const lowerQuery = globalSearchQuery.toLowerCase();
    const matched = allProducts.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.section_name && p.section_name.toLowerCase().includes(lowerQuery)) ||
      (p.category_name && p.category_name.toLowerCase().includes(lowerQuery))
    );

    const idMap: Record<number, number[]> = {};
    const firstSeenIdMap = new Map<string, number>();

    matched.forEach((p: Product) => {
      const key = p.poster_ingredient_id || `local_${p.id}`;
      if (!firstSeenIdMap.has(key)) {
        firstSeenIdMap.set(key, p.id);
        idMap[p.id] = [p.id];
      } else {
        const representativeId = firstSeenIdMap.get(key)!;
        idMap[representativeId].push(p.id);
      }
    });

    return idMap;
  }, [allProducts, globalSearchQuery]);

  if (status === "loading" || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  const isGlobalSearching = globalSearchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => {
                if (typeof selectedSupplierId === "number" || selectedSupplierId === "unsorted") {
                  setSelectedSupplierId("suppliers");
                } else {
                  router.push("/");
                }
              }}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900">
              {typeof selectedSupplierId === "number"
                ? suppliers.find((s) => s.id === selectedSupplierId)?.name || "Поставщик"
                : selectedSupplierId === "unsorted"
                ? "Нераспределенные"
                : "Каталог"}
            </h1>

            <button
              onClick={handleSync}
              disabled={syncing}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-[0.98] ${
                syncing ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title="Синхронизировать с Poster"
            >
              <svg className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pt-4 px-4 md:px-0">
        {selectedSupplierId === "suppliers" && (
          <>
            {/* Global Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Поиск товаров (например: Молоко)..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 rounded-xl text-sm transition-all outline-none shadow-sm"
                />
                {globalSearchQuery && (
                  <button
                    onClick={() => setGlobalSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isGlobalSearching ? (
              <div className="-mx-4 md:mx-0">
                <GenericProductListTab
                  products={searchedProducts}
                  suppliers={suppliers}
                  onReload={loadData}
                  title="Результаты поиска"
                  hideSearch={true}
                  relatedIdsMap={globalRelatedIdsMap}
                />
              </div>
            ) : (
              <>
                {/* Unsorted Action Card - Acts as Inbox */}
                {unassignedCount > 0 && (
                  <div 
                    onClick={() => setSelectedSupplierId("unsorted")}
                    className="mb-6 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl p-4 cursor-pointer transition-colors flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">⚠️</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-red-900">Требуют внимания</h3>
                        <p className="text-sm text-red-700 mt-0.5">
                          {unassignedCount} {unassignedCount % 10 === 1 && unassignedCount % 100 !== 11 ? "товар без поставщика" : [2,3,4].includes(unassignedCount % 10) && ![12,13,14].includes(unassignedCount % 100) ? "товара без поставщика" : "товаров без поставщика"}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-full p-2 shadow-sm text-red-600">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                    </div>
                  </div>
                )}

                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Все поставщики</h2>
                <div className="-mx-4 md:mx-0">
                  <SuppliersTab
                    suppliers={suppliers}
                    setSuppliers={setSuppliers}
                    loading={loading}
                    onReload={loadData}
                    onSelectSupplier={(id) => setSelectedSupplierId(id)}
                  />
                </div>
              </>
            )}
          </>
        )}

        {selectedSupplierId === "unsorted" && (
          <div className="-mx-4 md:mx-0">
            <GenericProductListTab
              products={unassignedProducts}
              suppliers={suppliers}
              onReload={loadData}
              title="Нераспределенные товары"
              relatedIdsMap={relatedIdsMap}
            />
          </div>
        )}

        {typeof selectedSupplierId === "number" && (
          <div className="-mx-4 md:mx-0">
            <GenericProductListTab
              products={supplierProducts}
              suppliers={suppliers}
              onReload={loadData}
              title={`Товары: ${suppliers.find((s) => s.id === selectedSupplierId)?.name}`}
            />
          </div>
        )}
      </main>
    </div>
  );
}
