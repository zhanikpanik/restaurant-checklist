import { useState, useMemo } from "react";
import { Product } from "@/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

export function GenericProductListTab({
  products,
  suppliers,
  onReload,
  title,
  showSupplierSelect = true,
  relatedIdsMap,
  hideSearch = false,
}: {
  products: Product[];
  suppliers: any[];
  onReload: () => void;
  title: string;
  showSupplierSelect?: boolean;
  relatedIdsMap?: Record<number, number[]>;
  hideSearch?: boolean;
}) {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (hideSearch || !searchQuery) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.section_name && p.section_name.toLowerCase().includes(lowerQuery)) ||
      (p.category_name && p.category_name.toLowerCase().includes(lowerQuery))
    );
  }, [products, searchQuery, hideSearch]);

  const handleSelectAll = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));

    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.add(id));
        return Array.from(next);
      });
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async (supplierId: string | number) => {
    setSubmitting(true);
    try {
      // Expand selected IDs using relatedIdsMap if available
      const allIdsToUpdate = selectedIds.flatMap(id => 
        relatedIdsMap && relatedIdsMap[id] ? relatedIdsMap[id] : [id]
      );
      // Remove duplicates just in case
      const uniqueIdsToUpdate = Array.from(new Set(allIdsToUpdate));

      const data = await api.post<{ updatedCount: number }>("/api/section-products/bulk", {
        product_ids: uniqueIdsToUpdate,
        supplier_id: Number(supplierId),
      });

      if (data.success && data.data) {
        toast.success(`Перемещено товаров: ${data.data.updatedCount}`);
        
        // Clear selections immediately
        setSelectedIds([]);
        setIsSheetOpen(false);
        
        // Trigger parent reload to refresh all data
        onReload();
      } else {
        toast.error(data.error || "Ошибка перемещения");
      }
    } catch (error) {
      toast.error("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <img src="/icons/box.svg" alt="Empty" className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>В этом списке нет товаров.</p>
      </div>
    );
  }

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id));
  const someFilteredSelected = filteredProducts.some(p => selectedIds.includes(p.id));

  return (
    <div>
      {/* Top Toolbar: Search & Select All */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex flex-col gap-4">
        {/* Search Bar */}
        {!hideSearch && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500 rounded-xl text-sm transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Select All */}
        <label className="flex items-center gap-3 cursor-pointer w-max">
          <div className="relative flex items-center justify-center w-6 h-6">
            <input 
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleSelectAll}
              className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-md checked:bg-brand-500 checked:border-brand-500 transition-all cursor-pointer"
            />
            <svg 
              className={`absolute w-4 h-4 text-white pointer-events-none transition-opacity ${someFilteredSelected ? 'opacity-100' : 'opacity-0'}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              {allFilteredSelected ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              )}
            </svg>
          </div>
          <span className="font-medium text-gray-700">
            {selectedIds.length > 0 ? `Выбрано: ${selectedIds.length}` : 'Выбрать все'}
          </span>
        </label>
      </div>

      {/* List */}
      <div className="bg-white pb-32">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>Ничего не найдено.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => toggleSelection(p.id)}
                className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-all active:scale-[0.98] ${
                  selectedIds.includes(p.id) ? "bg-brand-50/50" : "hover:bg-gray-50"
                }`}
              >
                <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => {}} 
                    className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-md checked:bg-brand-500 checked:border-brand-500 transition-all cursor-pointer"
                  />
                  <svg 
                    className="absolute w-4 h-4 text-white pointer-events-none peer-checked:block hidden" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className={`font-medium truncate ${selectedIds.includes(p.id) ? 'text-brand-900' : 'text-gray-900'}`}>
                    {p.name}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                    {p.section_name && <span>{p.section_name}</span>}
                    {p.category_name && <span>• {p.category_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {showSupplierSelect && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none md:pl-64">
          <button
            onClick={() => setIsSheetOpen(true)}
            className="pointer-events-auto bg-brand-500 hover:bg-brand-600 text-white px-6 py-4 rounded-full font-bold shadow-lg shadow-brand-500/30 flex items-center gap-3 active:scale-95 transition-all"
          >
            <span>Назначить поставщика</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
              {selectedIds.length}
            </span>
          </button>
        </div>
      )}

      {/* Assignment Bottom Sheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => !submitting && setIsSheetOpen(false)}
        title="Выберите поставщика"
      >
        <div className="pb-4">
          {submitting ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Перемещение товаров...</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {suppliers.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleAssign(s.id)}
                  className="w-full text-left px-4 py-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all active:scale-[0.98] group"
                >
                  <div className="font-medium text-gray-900 group-hover:text-brand-900">
                    {s.name}
                  </div>
                  {(s.phone || s.contact_info) && (
                    <div className="text-sm text-gray-500 mt-1 truncate">
                      {[s.phone, s.contact_info].filter(Boolean).join(" • ")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
