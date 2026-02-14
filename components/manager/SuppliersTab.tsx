"use client";

import { useToast } from "@/components/ui/Toast";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import type { Supplier } from "@/types";

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  loading: boolean;
  onReload: () => void;
}

export function SuppliersTab({
  suppliers,
  setSuppliers,
  loading,
  onReload,
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
                className="px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                      {supplier.poster_supplier_id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Poster
                        </span>
                      )}
                    </div>
                    {supplier.phone && (
                      <p className="text-sm text-gray-500 mt-1">Tel: {supplier.phone}</p>
                    )}
                    {supplier.contact_info && (
                      <p className="text-sm text-gray-500 mt-1">{supplier.contact_info}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
