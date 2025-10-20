"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRestaurant } from "@/store/useStore";
import type { Order, Supplier, ProductCategory } from "@/types";

export default function ManagerPage() {
  const restaurant = useRestaurant();
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers" | "categories">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Удалить этот заказ?")) return;

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setOrders(orders.filter(o => o.id !== orderId));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Ожидает", color: "bg-yellow-100 text-yellow-800" },
      sent: { label: "Отправлен", color: "bg-blue-100 text-blue-800" },
      delivered: { label: "Доставлен", color: "bg-green-100 text-green-800" },
      cancelled: { label: "Отменен", color: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Главная
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">
                👨‍💼 Панель менеджера
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {restaurant.current?.name || "Ресторан"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "orders"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📦 Заказы
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "suppliers"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🚚 Поставщики
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "categories"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📂 Категории
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Загрузка данных...</p>
            </div>
          ) : (
            <>
              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Все заказы ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет заказов
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Дата
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Отдел
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Товаров
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Статус
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Действия
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                #{order.id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {formatDate(order.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {order.order_data.department || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {order.order_data.items?.length || 0}
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(order.status)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Удалить
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Suppliers Tab */}
              {activeTab === "suppliers" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Поставщики ({suppliers.length})
                  </h2>
                  {suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет поставщиков
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {suppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {supplier.name}
                              </h3>
                              {supplier.phone && (
                                <p className="text-sm text-gray-500 mt-1">
                                  📞 {supplier.phone}
                                </p>
                              )}
                              {supplier.contact_info && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {supplier.contact_info}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === "categories" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Категории товаров ({categories.length})
                  </h2>
                  {categories.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет категорий
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <h3 className="font-medium text-gray-900">
                            {category.name}
                          </h3>
                          {category.supplier_id && (
                            <p className="text-sm text-gray-500 mt-1">
                              Поставщик ID: {category.supplier_id}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}