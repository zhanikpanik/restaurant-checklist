"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { CategoriesTab } from "@/components/manager/CategoriesTab";
import { useToast } from "@/components/ui/Toast";
import type { Supplier, ProductCategory } from "@/types";

type TabType = "suppliers" | "categories";

const TABS = [
  { id: "suppliers", label: "Поставщики", icon: "🏢" },
  { id: "categories", label: "Категории", icon: "🏷️" },
];

export default function SuppliersCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Role-based access control - redirect unauthorized users
  const isAuthorized = status === "authenticated" && ["admin", "manager"].includes(session?.user?.role || "");

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "authenticated" && !["admin", "manager"].includes(session?.user?.role || "")) {
      router.replace("/");
    }
  }, [session, status, router]);

  // Load data when tab changes
  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [activeTab, isAuthorized]);

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
      switch (activeTab) {
        case "suppliers":
          const suppliersRes = await fetch("/api/suppliers");
          const suppliersData = await suppliersRes.json();
          if (suppliersData.success) setSuppliers(suppliersData.data);
          break;

        case "categories":
          const categoriesRes = await fetch("/api/categories");
          const categoriesData = await categoriesRes.json();
          if (categoriesData.success) setCategories(categoriesData.data);
          
          // Also load suppliers for category form dropdown
          const suppliersForCategoriesRes = await fetch("/api/suppliers");
          const suppliersForCategoriesData = await suppliersForCategoriesRes.json();
          if (suppliersForCategoriesData.success) setSuppliers(suppliersForCategoriesData.data);
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="🏢 Поставщики и Категории"
        showBackButton
        backUrl="/"
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === "suppliers" && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === "categories" && (
            <CategoriesTab
              categories={categories}
              setCategories={setCategories}
              suppliers={suppliers}
              loading={loading}
              onReload={loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
