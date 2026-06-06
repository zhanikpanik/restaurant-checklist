"use client";

import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { GenericProductListTab } from "@/components/manager/UnsortedTab";
import { useSuppliersCategories } from "@/hooks/useSuppliersCategories";

interface PageProps {
  pageTitle: string;
  syncing: boolean;
  selectedSupplierId: string | number;
  setSelectedSupplierId: (id: string | number) => void;
  handleSync: () => void;
  handleBack: () => void;
  suppliers: any[];
  loading: boolean;
  unassignedCount: number;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  searchedProducts: any[];
  globalRelatedIdsMap: Record<number, number[]>;
  loadData: () => void;
  unassignedProducts: any[];
  relatedIdsMap: Record<number, number[]>;
  supplierProducts: any[];
}

// ── Header ──────────────────────────────────────────────────
function Header({ pageTitle, syncing, handleSync, handleBack }: PageProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="relative flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900">
            {pageTitle}
          </h1>

          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-[0.98] ${
              syncing ? "bg-brand-100 text-brand-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Синхронизировать с Poster"
          >
            <svg
              className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Suppliers View ──────────────────────────────────────────
function SuppliersView({
  suppliers,
  loading,
  unassignedCount,
  globalSearchQuery,
  setGlobalSearchQuery,
  setSelectedSupplierId,
  searchedProducts,
  globalRelatedIdsMap,
  loadData,
}: PageProps) {
  const isGlobalSearching = globalSearchQuery.trim().length > 0;

  return (
    <>
      {/* Search */}
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
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 rounded-xl text-sm transition-all outline-none shadow-sm"
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
          {unassignedCount > 0 && (
            <button
              onClick={() => setSelectedSupplierId("unsorted")}
              className="w-full mb-6 bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 text-left cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <h3 className="font-semibold text-gray-900">
                  {unassignedCount} ингредиентов без поставщика
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Требуют распределения для заказа
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <SuppliersTab
            suppliers={suppliers}
            setSuppliers={() => {}}
            loading={loading}
            onReload={loadData}
            onSelectSupplier={(id) => setSelectedSupplierId(id)}
          />
        </>
      )}
    </>
  );
}

// ── Unsorted View ───────────────────────────────────────────
function UnsortedView({ unassignedProducts, suppliers, relatedIdsMap, loadData }: PageProps) {
  return (
    <div className="-mx-4 md:mx-0">
      <GenericProductListTab
        products={unassignedProducts}
        suppliers={suppliers}
        onReload={loadData}
        title="Нераспределенные товары"
        relatedIdsMap={relatedIdsMap}
      />
    </div>
  );
}

// ── Supplier Detail View ────────────────────────────────────
function SupplierDetailView({ supplierProducts, suppliers, selectedSupplierId, loadData }: PageProps) {
  const supplierName =
    typeof selectedSupplierId === "number"
      ? suppliers.find((s: any) => s.id === selectedSupplierId)?.name
      : "";

  return (
    <div className="-mx-4 md:mx-0">
      <GenericProductListTab
        products={supplierProducts}
        suppliers={suppliers}
        onReload={loadData}
        title={`Товары: ${supplierName}`}
      />
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function SuppliersCategoriesPage() {
  const props = useSuppliersCategories();

  if (props.status === "loading" || !props.isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-brand-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Header {...props} />

      <main className="max-w-2xl mx-auto pt-4 px-4 md:px-0">
        {props.selectedSupplierId === "suppliers" && <SuppliersView {...props} />}
        {props.selectedSupplierId === "unsorted" && <UnsortedView {...props} />}
        {typeof props.selectedSupplierId === "number" && <SupplierDetailView {...props} />}
      </main>
    </div>
  );
}
