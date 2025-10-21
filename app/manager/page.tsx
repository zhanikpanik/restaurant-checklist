"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRestaurant } from "@/store/useStore";
import type { Order, Supplier, ProductCategory, Product, Section } from "@/types";

type TabType = "orders" | "delivered" | "categories" | "suppliers" | "departments" | "products" | "settings";

interface ProductFormData {
  id?: number;
  name: string;
  unit: string;
  section_id: number | null;
  category_id: number | null;
  is_active: boolean;
}

interface SectionFormData {
  id?: number;
  name: string;
  emoji: string;
  poster_storage_id: number | null;
}

export default function ManagerPage() {
  const restaurant = useRestaurant();
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionFormData | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Load sections and categories for product form
    const loadFormData = async () => {
      try {
        const [sectionsRes, categoriesRes] = await Promise.all([
          fetch("/api/sections"),
          fetch("/api/categories")
        ]);
        const sectionsData = await sectionsRes.json();
        const categoriesData = await categoriesRes.json();

        if (sectionsData.success) setSections(sectionsData.data);
        if (categoriesData.success) setCategories(categoriesData.data);
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadFormData();
  }, []);

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

        case "settings":
          // TODO: Implement this tab
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

  const handleCreateProduct = () => {
    setEditingProduct({
      name: "",
      unit: "",
      section_id: null,
      category_id: null,
      is_active: true,
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      unit: product.unit || "",
      section_id: product.section_id,
      category_id: product.category_id,
      is_active: product.is_active,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      const url = "/api/section-products";
      const method = editingProduct.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });

      const data = await response.json();

      if (data.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        loadData(); // Reload products
      } else {
        alert(data.error || "Ошибка при сохранении товара");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Ошибка при сохранении товара");
    }
  };

  const handleCreateSection = () => {
    setEditingSection({
      name: "",
      emoji: "📦",
      poster_storage_id: null,
    });
    setShowSectionModal(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection({
      id: section.id,
      name: section.name,
      emoji: section.emoji || "📦",
      poster_storage_id: section.poster_storage_id ?? null,
    });
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    try {
      const url = "/api/sections";
      const method = editingSection.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSection),
      });

      const data = await response.json();

      if (data.success) {
        setShowSectionModal(false);
        setEditingSection(null);
        loadData(); // Reload sections
      } else {
        alert(data.error || "Ошибка при сохранении секции");
      }
    } catch (error) {
      console.error("Error saving section:", error);
      alert("Ошибка при сохранении секции");
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm("Удалить эту секцию?")) return;

    try {
      const response = await fetch(`/api/sections?id=${sectionId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setSections(sections.filter(s => s.id !== sectionId));
      } else {
        alert(data.error || "Ошибка при удалении секции");
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      alert("Ошибка при удалении секции");
    }
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
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "orders"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📋 Заказы
            </button>
            <button
              onClick={() => setActiveTab("delivered")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "delivered"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ✅ Доставлено
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "categories"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🏷️ Категории
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "suppliers"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🏢 Поставщики
            </button>
            <button
              onClick={() => setActiveTab("departments")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "departments"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🏪 Отделы
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "products"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📦 Товары
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-shrink-0 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ⚙️ Настройки
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
                            <div className="flex-1">
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
                              {(supplier as any).poster_supplier_id && (
                                <p className="text-xs text-gray-400 italic mt-1">
                                  Из Poster (ID: {(supplier as any).poster_supplier_id})
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

              {/* Delivered Tab */}
              {activeTab === "delivered" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Доставленные заказы ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет доставленных заказов
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
                              Дата доставки
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Отдел
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Товаров
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                          {(category as any).poster_category_id && (
                            <p className="text-xs text-gray-400 italic mt-1">
                              Из Poster (ID: {(category as any).poster_category_id})
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Departments Tab */}
              {activeTab === "departments" && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                      Секции ({sections.length})
                    </h2>
                    <button
                      onClick={handleCreateSection}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ➕ Добавить секцию
                    </button>
                  </div>
                  {sections.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет секций
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {sections.map((section) => (
                        <div
                          key={section.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-lg">
                                {section.emoji} {section.name}
                              </h3>
                              {section.poster_storage_id && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Poster Storage ID: {section.poster_storage_id}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                Товаров: {(section as any).custom_products_count || 0}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSection(section)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Редактировать
                              </button>
                              {!section.poster_storage_id && (
                                <button
                                  onClick={() => handleDeleteSection(section.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Удалить
                                </button>
                              )}
                              {section.poster_storage_id && (
                                <span className="text-xs text-gray-400 italic">
                                  Из Poster
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                      Товары ({products.length})
                    </h2>
                    <button
                      onClick={handleCreateProduct}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ➕ Добавить товар
                    </button>
                  </div>
                  {products.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет товаров
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Название
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Категория
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Секция
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Единица
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
                          {products.map((product: any) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {product.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {product.category_name || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {product.section_name || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {product.unit || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  product.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {product.is_active ? "Активен" : "Неактивен"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="text-blue-600 hover:text-blue-800 mr-3"
                                >
                                  Редактировать
                                </button>
                                {!product.poster_ingredient_id ? (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Удалить товар "${product.name}"?`)) return;
                                      try {
                                        const response = await fetch(`/api/section-products?id=${product.id}`, {
                                          method: "DELETE",
                                        });
                                        const data = await response.json();
                                        if (data.success) {
                                          setProducts(products.filter((p: any) => p.id !== product.id));
                                        }
                                      } catch (error) {
                                        console.error("Error deleting product:", error);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Удалить
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    Из Poster
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Настройки</h2>
                  <p className="text-gray-500 text-center py-8">
                    В разработке
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section Modal */}
      {showSectionModal && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingSection.id ? "Редактировать секцию" : "Добавить секцию"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={editingSection.name}
                    onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Название секции"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Эмодзи
                  </label>
                  <input
                    type="text"
                    value={editingSection.emoji}
                    onChange={(e) => setEditingSection({ ...editingSection, emoji: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="📦"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poster Storage ID
                  </label>
                  <input
                    type="number"
                    value={editingSection.poster_storage_id || ""}
                    onChange={(e) => setEditingSection({ ...editingSection, poster_storage_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="ID склада в Poster"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSectionModal(false);
                    setEditingSection(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveSection}
                  disabled={!editingSection.name}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingProduct.id ? "Редактировать товар" : "Добавить товар"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Название товара"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Единица измерения
                  </label>
                  <input
                    type="text"
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="кг, шт, л"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Секция *
                  </label>
                  <select
                    value={editingProduct.section_id || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, section_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Выберите секцию</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.emoji} {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория
                  </label>
                  <select
                    value={editingProduct.category_id || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Без категории</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingProduct.is_active}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Активен
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={!editingProduct.name || !editingProduct.section_id}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}