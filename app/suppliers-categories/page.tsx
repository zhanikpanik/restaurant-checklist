"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { CategoriesTab } from "@/components/manager/CategoriesTab";
import { GenericProductListTab } from "@/components/manager/UnsortedTab";
import { CreateSupplierModal } from "@/components/manager/CreateSupplierModal";
import { useToast } from "@/components/ui/Toast";
import type { Supplier, ProductCategory, Product } from "@/types";

type TabType = "suppliers" | "categories" | "unsorted";

const TABS = [
  { id: "suppliers", label: "Поставщики", icon: "🏢" },
];

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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    if (isAuthorized) {
      fetch("/api/section-products?active=true")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const count = data.data.filter((p: Product) => !p.supplier_id).length;
            setUnassignedCount(count);
          }
        });
    }
  }, [isAuthorized, selectedSupplierId, loading]); 

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

      if (selectedSupplierId === "suppliers") {
        // Just showing the list of suppliers (default view)
      } else if (selectedSupplierId === "unsorted") {
        const unsortedRes = await fetch("/api/section-products?active=true");
        const unsortedData = await unsortedRes.json();
        if (unsortedData.success) {
          const unassigned = unsortedData.data.filter((p: Product) => !p.supplier_id);
          setUnassignedProducts(unassigned);
        }
      } else if (selectedSupplierId !== "create_new") {
        // Load products for specific supplier
        const productsRes = await fetch("/api/section-products?active=true");
        const productsData = await productsRes.json();
        if (productsData.success) {
          const filtered = productsData.data.filter((p: Product) => p.supplier_id === Number(selectedSupplierId));
          setSupplierProducts(filtered);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetch("/api/section-products?active=true")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const count = data.data.filter((p: Product) => !p.supplier_id).length;
            setUnassignedCount(count);
          }
        });
    }
  }, [isAuthorized, selectedSupplierId]); 

  const dynamicTabs = [
    ...(unassignedCount > 0 ? [{ id: "unsorted", label: `Неразобранное (${unassignedCount})`, icon: "⚠️" }] : []),
    { id: "suppliers", label: "Все поставщики", icon: "🏢" }, // Overview tab
    ...suppliers.map(s => ({ id: s.id, label: s.name, icon: "📦" })),
    { id: "create_new", label: "Добавить", icon: "➕" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="🏢 Поставщики и Категории"
        showBackButton
        backUrl="/"
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-6 overflow-x-auto pb-2">
          <TabNavigation
            tabs={dynamicTabs}
            activeTab={String(selectedSupplierId)}
            onTabChange={(tabId) => {
              if (tabId === "create_new") {
                setShowCreateModal(true);
              } else {
                setSelectedSupplierId(tabId);
              }
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {selectedSupplierId === "unsorted" && (
            <GenericProductListTab
              products={unassignedProducts}
              suppliers={suppliers}
              onReload={loadData}
              title="⚠️ Нераспределенные товары"
            />
          )}

          {selectedSupplierId === "suppliers" && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              loading={loading}
              onReload={loadData}
            />
          )}

          {selectedSupplierId !== "suppliers" && selectedSupplierId !== "unsorted" && (
            <GenericProductListTab
              products={supplierProducts}
              suppliers={suppliers}
              onReload={loadData}
              title="📦 Товары поставщика"
            />
          )}
        </div>
      </div>

      <CreateSupplierModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData();
        }}
      />
    </div>
  );
}
