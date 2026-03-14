"use client";

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
  loading,
  onSelectSupplier,
}: SuppliersTabProps) {

  if (loading) {
    return (
      <div className="divide-y divide-gray-200">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-4">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="py-12">
        <EmptyStateIllustrated
          type="suppliers"
          title="Нет поставщиков"
          description="Синхронизируйте поставщиков из Poster, используя кнопку в шапке"
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {suppliers.map((supplier) => (
        <div
          key={supplier.id}
          onClick={() => onSelectSupplier(supplier.id)}
          className="bg-transparent py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {supplier.name}
                </h3>
                {supplier.poster_supplier_id && (
                  <span className="flex-shrink-0 text-[10px] bg-brand-50 text-brand-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Poster
                  </span>
                )}
              </div>
              {supplier.phone && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {supplier.phone}
                </p>
              )}
            </div>
            
            <div className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
