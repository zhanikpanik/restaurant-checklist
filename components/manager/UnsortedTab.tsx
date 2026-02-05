import { useState } from "react";
import { Product } from "@/types";
import { FormButton, FormSelect } from "@/components/ui/BottomSheet";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

export function GenericProductListTab({
  products,
  suppliers,
  onReload,
  title,
  showSupplierSelect = true,
}: {
  products: Product[];
  suppliers: any[];
  onReload: () => void;
  title: string;
  showSupplierSelect?: boolean;
}) {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [targetSupplierId, setTargetSupplierId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!targetSupplierId) {
      toast.error("Выберите поставщика");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{ updatedCount: number }>("/api/section-products/bulk", {
        product_ids: selectedIds,
        supplier_id: Number(targetSupplierId),
      });

      if (data.success && data.data) {
        toast.success(`Перемещено товаров: ${data.data.updatedCount}`);
        setSelectedIds([]);
        setTargetSupplierId("");
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
        <div className="text-4xl mb-4">📦</div>
        <p>В этом списке нет товаров.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {title} ({products.length})
        </h2>
      </div>

      {/* Selection Toolbar (Top) - Just for Select All */}
      <div className="mb-4 px-1 sticky top-4 z-10">
        <label className="flex items-center gap-2 cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg inline-block shadow-sm border border-gray-200">
          <input 
            type="checkbox"
            checked={selectedIds.length === products.length}
            onChange={handleSelectAll}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium">Выбрать все ({selectedIds.length})</span>
        </label>
      </div>

      {/* List */}
      <div className="space-y-1 pb-24">
        {products.map(p => (
          <div 
            key={p.id} 
            onClick={() => toggleSelection(p.id)}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${
              selectedIds.includes(p.id) ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(p.id)}
              onChange={() => {}} 
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none flex-shrink-0"
            />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">{p.name}</div>
                <div className="flex gap-2 text-xs text-gray-500">
                  {p.section_name && <span>{p.section_name}</span>}
                  {p.category_name && <span>• {p.category_name}</span>}
                </div>
              </div>
              
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 font-medium text-sm">
                {p.quantity || 0}
              </div>
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-xs">
                {p.unit}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Bottom Action Bar */}
      {showSupplierSelect && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20 md:pl-64">
          <div className="max-w-7xl mx-auto flex gap-3 items-center">
            <div className="flex-1">
              <select
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-base"
                value={targetSupplierId}
                onChange={(e) => setTargetSupplierId(e.target.value)}
              >
                <option value="">Выберите поставщика...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              disabled={!targetSupplierId || submitting}
              className={`px-6 py-3 rounded-lg font-bold text-white transition-colors min-w-[100px] ${
                !targetSupplierId 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? "..." : "ОК"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}