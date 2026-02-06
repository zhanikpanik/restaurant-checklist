import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/store/useStore";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { Order, Supplier, Product } from "@/types";
import { useNavigate } from "react-router-dom";

// Components
import { ProcurementTab } from "@/components/manager/ProcurementTab";
import { OrdersTab } from "@/components/manager/OrdersTab";

type TabType = "workspace" | "active" | "history";

const TABS = [
  { id: "workspace", label: "Сборка и Отправка", icon: "🛠️" },
  { id: "active", label: "Ожидаем", icon: "🚚" },
  { id: "history", label: "История", icon: "📋" },
];

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const restaurant = useRestaurant();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>("workspace");
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        api.get<Order[]>("/api/orders?all=true"),
        api.get<Supplier[]>("/api/suppliers"),
        api.get<Product[]>("/api/section-products"),
      ]);

      if (ordersRes.success) setOrders(ordersRes.data || []);
      if (suppliersRes.success) setSuppliers(suppliersRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  // Filter orders for different tabs
  const getTabOrders = () => {
    switch (activeTab) {
      case "workspace":
        // Only pending orders are editable in workspace
        // But "Dispatch" view in workspace might need to see things too?
        // Actually ProcurementTab handles its own filtering of 'pending' and 'sent'.
        // We pass ALL orders to ProcurementTab so it can manage "Review" (pending) and "Dispatch" (pending -> sent)
        return orders; 
      case "active":
        // Orders that are sent but not delivered
        // Also maybe pending orders if we want to see them in list format?
        // Requirement: "Tab 2: Active Orders... Shows Sent orders"
        // Let's show 'sent' and 'pending' (so you can see what's waiting to be processed too, read-only style)
        return orders.filter(o => ["sent", "pending"].includes(o.status));
      case "history":
        // Delivered and Cancelled
        return orders.filter(o => ["delivered", "cancelled"].includes(o.status));
      default:
        return orders;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader 
        title="📦 Управление заказами" 
        rightContent={
          <span className="text-sm font-medium text-gray-600">
            {restaurant.current?.name}
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as TabType)}
        />

        <div className="bg-white rounded-xl shadow-sm min-h-[500px]">
          {activeTab === "workspace" && (
            <ProcurementTab
              orders={orders}
              setOrders={setOrders}
              suppliers={suppliers}
              products={products}
              loading={loading}
              restaurantName={restaurant.current?.name || ""}
              onReload={loadData}
            />
          )}

          {activeTab === "active" && (
            <div className="p-4">
               {/* Reusing OrdersTab but maybe we should simplify it or create a specific list component? */}
               {/* OrdersTab has all the logic for viewing details, so it's good. */}
               {/* We just need to make sure it doesn't duplicate the "Procurement" functionality if not needed. */}
               {/* But wait, OrdersTab has 'statusFilter' state internal. */}
               {/* Let's pass pre-filtered orders to it. */}
               <OrdersTab
                  orders={getTabOrders()} // Passing filtered 'sent'/'pending'
                  setOrders={setOrders}
                  suppliers={suppliers}
                  products={products}
                  loading={loading}
                  restaurantName={restaurant.current?.name || ""}
                  onReload={loadData}
               />
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-4">
                <OrdersTab
                  orders={getTabOrders()} // Passing filtered 'delivered'/'cancelled'
                  setOrders={setOrders}
                  suppliers={suppliers}
                  products={products}
                  loading={loading}
                  restaurantName={restaurant.current?.name || ""}
                  onReload={loadData}
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
