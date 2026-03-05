"use client";

import { useToast } from "@/components/ui/Toast";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import type { Supplier } from "@/types";

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  loading: boolean;
  onReload: () => void;
  onSelectSupplier: (id: number) => void;
}

export function SuppliersTab({
  suppliers,
  setSuppliers,
  loading,
  onReload,
  onSelectSupplier,
}: SuppliersTabProps) {
  const toast = useToast();

  if (loading) {
    return (
      <div>
        <div className="px-4 pt-4 mb-4">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white">
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 mb-4">
        <h2 className="text-lg font-semibold">Поставщики ({suppliers.length})</h2>
      </div>

      {suppliers.length === 0 ? (
        <div className="px-4">
          <EmptyStateIllustrated
            type="suppliers"
            title="Нет поставщиков"
            description="Синхронизируйте поставщиков из Poster, используя кнопку в шапке"
          />
        </div>
      ) : (
        <div className="bg-white">
          <div className="divide-y divide-gray-100">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => onSelectSupplier(supplier.id)}
                className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98] active:bg-gray-100 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                    {supplier.poster_supplier_id && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                        Poster
                      </span>
                    )}
                  </div>
                  {supplier.phone && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {supplier.phone}
                    </p>
                  )}
                </div>
                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
