"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRestaurant } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { OrdersTab } from "@/components/manager/OrdersTab";
import { CategoriesTab } from "@/components/manager/CategoriesTab";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { DepartmentsTab } from "@/components/manager/DepartmentsTab";
import { ProductsTab } from "@/components/manager/ProductsTab";
import { UsersTab } from "@/components/manager/UsersTab";
import { useToast } from "@/components/ui/Toast";
import type { Order, Supplier, ProductCategory, Product, Section } from "@/types";

type TabType =
  | "orders"
  | "categories"
  | "suppliers"
  | "departments"
  | "products"
  | "users";

const TABS = [
  { id: "orders", label: "Заказы", icon: "📋" },
  { id: "categories", label: "Категории", icon: "🏷️" },
  { id: "suppliers", label: "Поставщики", icon: "🏢" },
  { id: "departments", label: "Отделы", icon: "🏪" },
  { id: "products", label: "Товары", icon: "📦" },
  { id: "users", label: "Пользователи", icon: "👥" },
];

export default function ManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const restaurant = useRestaurant();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Compute access check
  const isAuthorized = status === "authenticated" && ["admin", "manager"].includes(session?.user?.role || "");

  // Role-based access control - redirect unauthorized users
  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "authenticated" && !["admin", "manager"].includes(session?.user?.role || "")) {
      router.replace("/");
    }
  }, [session, status, router]);

  // Load form data on mount (sections, categories, suppliers for dropdowns)
  // Only load when authorized
  useEffect(() => {
    if (!isAuthorized) return;
    
    const loadFormData = async () => {
      try {
        const [sectionsRes, categoriesRes, suppliersRes] = await Promise.all([
          fetch("/api/sections"),
          fetch("/api/categories"),
          fetch("/api/suppliers"),
        ]);
        const sectionsData = await sectionsRes.json();
        const categoriesData = await categoriesRes.json();
        const suppliersData = await suppliersRes.json();

        if (sectionsData.success) setSections(sectionsData.data);
        if (categoriesData.success) setCategories(categoriesData.data);
        if (suppliersData.success) setSuppliers(suppliersData.data);
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadFormData();
  }, [isAuthorized]);

  // Load tab-specific data when tab changes
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
        case "orders":
          // Load ALL orders (filtering is done in OrdersTab)
          const ordersRes = await fetch("/api/orders?all=true");
          const ordersData = await ordersRes.json();
          if (ordersData.success) setOrders(ordersData.data);
          break;

        case "suppliers":
          const suppliersRes = await fetch("/api/suppliers");
          const suppliersData = await suppliersRes.json();
          if (suppliersData.success) setSuppliers(suppliersData.data);
          break;

        case "categories":
          const categoriesRes = await fetch("/api/categories");
          const categoriesData = await categoriesRes.json();
          if (categoriesData.success) setCategories(categoriesData.data);
          break;

        case "products":
          const productsRes = await fetch("/api/section-products");
          const productsData = await productsRes.json();
          if (productsData.success) setProducts(productsData.data);
          break;

        case "departments":
          const sectionsRes = await fetch("/api/sections");
          const sectionsData = await sectionsRes.json();
          if (sectionsData.success) setSections(sectionsData.data);
          break;

        case "users":
          // Use include_sections=true to get users with sections in one query (avoids N+1)
          const usersRes = await fetch("/api/users?include_sections=true");
          const usersData = await usersRes.json();
          if (usersData.success) {
            setUsers(usersData.data);
          }
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromPoster = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/sync-sections");
      const data = await response.json();

      if (data.success) {
        const { syncedCount, ingredientsSynced } = data.data;
        toast.success(`Синхронизировано: ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);
        loadData();
      } else {
        toast.error(data.error || "Ошибка синхронизации");
      }
    } catch (error) {
      console.error("Error syncing from Poster:", error);
      toast.error("Ошибка синхронизации с Poster");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="👨‍💼 Панель менеджера"
        rightContent={
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncFromPoster}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {syncing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Синхронизация...
                </>
              ) : (
                <>🔄 Синхронизировать</>
              )}
            </button>
            <span className="text-gray-500">|</span>
            <span>{restaurant.current?.name || "Ресторан"}</span>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              setOrders={setOrders}
              suppliers={suppliers}
              products={products}
              loading={loading}
              restaurantName={restaurant.current?.name || "Ресторан"}
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

          {activeTab === "suppliers" && (
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsTab
              sections={sections}
              setSections={setSections}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === "products" && (
            <ProductsTab
              products={products}
              setProducts={setProducts}
              sections={sections}
              categories={categories}
              loading={loading}
              onReload={loadData}
            />
          )}

          {activeTab === "users" && (
            <UsersTab
              users={users}
              setUsers={setUsers}
              sections={sections}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
