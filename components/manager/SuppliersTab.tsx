"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { api } from "@/lib/api-client";
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
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post("/api/poster/sync-suppliers", {});

      if (response.success) {
        toast.success((response as any).message || "Поставщики синхронизированы");
        onReload();
      } else {
        toast.error(response.error || "Ошибка синхронизации");
      }
    } catch (error) {
      console.error("Error syncing suppliers:", error);
      toast.error("Ошибка синхронизации поставщиков");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Поставщики ({suppliers.length})</h2>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? "Синхронизация..." : "🔄 Синхронизировать из Poster"}
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyStateIllustrated
          type="suppliers"
          title="Нет поставщиков"
          description="Синхронизируйте поставщиков из Poster"
          action={{
            label: "🔄 Синхронизировать из Poster",
            onClick: handleSync,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
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
                    <p className="text-sm text-gray-500 mt-1">📞 {supplier.phone}</p>
                  )}
                  {supplier.contact_info && (
                    <p className="text-sm text-gray-500 mt-1">{supplier.contact_info}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
