"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { OrdersTab } from "@/components/manager/OrdersTab";
import { DeliveredTab } from "@/components/manager/DeliveredTab";
import { CategoriesTab } from "@/components/manager/CategoriesTab";
import { SuppliersTab } from "@/components/manager/SuppliersTab";
import { DepartmentsTab } from "@/components/manager/DepartmentsTab";
import { ProductsTab } from "@/components/manager/ProductsTab";
import { UsersTab } from "@/components/manager/UsersTab";
import { SettingsTab } from "@/components/manager/SettingsTab";
import type { Order, Supplier, ProductCategory, Product, Section } from "@/types";

type TabType =
  | "orders"
  | "delivered"
  | "categories"
  | "suppliers"
  | "departments"
  | "products"
  | "users"
  | "settings";

const TABS = [
  { id: "orders", label: "Заказы", icon: "📋" },
  { id: "delivered", label: "Доставлено", icon: "✅" },
  { id: "categories", label: "Категории", icon: "🏷️" },
  { id: "suppliers", label: "Поставщики", icon: "🏢" },
  { id: "departments", label: "Отделы", icon: "🏪" },
  { id: "products", label: "Товары", icon: "📦" },
  { id: "users", label: "Пользователи", icon: "👥" },
  { id: "settings", label: "Настройки", icon: "⚙️" },
];

export default function ManagerPage() {
  const restaurant = useRestaurant();
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load form data on mount (sections, categories, suppliers for dropdowns)
  useEffect(() => {
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
  }, []);

  // Load tab-specific data when tab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "orders":
          const ordersRes = await fetch("/api/orders");
          const ordersData = await ordersRes.json();
          if (ordersData.success) setOrders(ordersData.data);
          break;

        case "delivered":
          const deliveredRes = await fetch("/api/orders?status=delivered");
          const deliveredData = await deliveredRes.json();
          if (deliveredData.success) setOrders(deliveredData.data);
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
          const usersRes = await fetch("/api/users");
          const usersData = await usersRes.json();
          if (usersData.success) {
            const usersWithSections = await Promise.all(
              usersData.data.map(async (user: any) => {
                const sectionsRes = await fetch(`/api/user-sections?user_id=${user.id}`);
                const sectionsData = await sectionsRes.json();
                return {
                  ...user,
                  assigned_sections: sectionsData.success ? sectionsData.data : [],
                };
              })
            );
            setUsers(usersWithSections);
          }
          break;

        case "settings":
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
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
        alert(`Синхронизировано: ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`);
        loadData();
      } else {
        alert(data.error || "Ошибка синхронизации");
      }
    } catch (error) {
      console.error("Error syncing from Poster:", error);
      alert("Ошибка синхронизации с Poster");
    } finally {
      setSyncing(false);
    }
  };

  // Handler for DeliveredTab to view order details (placeholder for now)
  const handleViewDeliveredOrder = (order: Order) => {
    // For delivered orders, switch to orders tab and the modal will open there
    // This is a simplified approach - could enhance later
    alert(`Заказ #${order.id}\nТоваров: ${order.order_data.items?.length || 0}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="👨‍💼 Панель менеджера"
        rightContent={restaurant.current?.name || "Ресторан"}
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
            />
          )}

          {activeTab === "delivered" && (
            <DeliveredTab
              orders={orders}
              loading={loading}
              onViewOrder={handleViewDeliveredOrder}
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
              onSync={handleSyncFromPoster}
              syncing={syncing}
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

          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}
