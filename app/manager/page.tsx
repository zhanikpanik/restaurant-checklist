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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Load sections, categories, and suppliers for the app
    const loadFormData = async () => {
      try {
        const [sectionsRes, categoriesRes, suppliersRes] = await Promise.all([
          fetch("/api/sections"),
          fetch("/api/categories"),
          fetch("/api/suppliers")
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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const groupItemsBySupplier = (items: any[]) => {
    const grouped = new Map<string, any[]>();

    items.forEach((item) => {
      const supplierName = item.supplier || "Без поставщика";
      if (!grouped.has(supplierName)) {
        grouped.set(supplierName, []);
      }
      grouped.get(supplierName)!.push(item);
    });

    return grouped;
  };

  const sendToWhatsApp = (supplierName: string, items: any[], orderDate: Date) => {
    // Find supplier phone number
    const supplier = suppliers.find(s => s.name === supplierName);

    if (!supplier?.phone) {
      alert(`Номер телефона для поставщика "${supplierName}" не найден`);
      return;
    }

    // Format order message
    let message = `🛒 *Заказ от ${restaurant.name || "Ресторан"}*\n\n`;
    message += `📅 ${formatDate(orderDate)}\n\n`;
    message += `*Товары:*\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || "шт"}\n`;
    });

    message += `\n_Всего позиций: ${items.length}_`;

    // Clean phone number (remove spaces, dashes, etc)
    const cleanPhone = supplier.phone.replace(/\D/g, '');

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          supplier_id: editingCategory.supplier_id || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        loadData(); // Reload categories
      } else {
        alert(data.error || "Ошибка при сохранении категории");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Ошибка при сохранении категории");
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
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleViewOrder(order)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Просмотр
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Удалить
                                  </button>
                                </div>
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
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {category.name}
                              </h3>
                              {(category as any).supplier_name ? (
                                <p className="text-sm text-gray-600 mt-1">
                                  📦 Поставщик: {(category as any).supplier_name}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 mt-1">
                                  Поставщик не назначен
                                </p>
                              )}
                              {(category as any).poster_category_id && (
                                <p className="text-xs text-gray-400 italic mt-1">
                                  Из Poster (ID: {(category as any).poster_category_id})
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="ml-3 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                              Назначить поставщика
                            </button>
                          </div>
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

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Заказ #{selectedOrder.id}
              </h2>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Order Info */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Дата создания</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Статус</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                {selectedOrder.order_data.department && (
                  <div>
                    <p className="text-sm text-gray-500">Отдел</p>
                    <p className="font-medium">{selectedOrder.order_data.department}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Всего товаров</p>
                  <p className="font-medium">{selectedOrder.order_data.items?.length || 0}</p>
                </div>
              </div>

              {/* Items grouped by supplier */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-3">Товары по поставщикам</h3>
                {Array.from(groupItemsBySupplier(selectedOrder.order_data.items || [])).map(([supplierName, items]) => (
                  <div key={supplierName} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        {supplierName}
                      </h4>
                      <button
                        onClick={() => sendToWhatsApp(supplierName, items, selectedOrder.created_at)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-t">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.category && (
                              <p className="text-sm text-gray-500">{item.category}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {item.quantity} {item.unit || "шт"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600">
                        Всего позиций: <span className="font-semibold">{items.length}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrder.order_data.notes && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Примечания:</p>
                  <p className="text-sm text-yellow-700">{selectedOrder.order_data.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold">Назначить поставщика</h2>
              <p className="text-sm text-gray-500 mt-1">
                Категория: {editingCategory.name}
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите поставщика
                  </label>
                  <select
                    value={editingCategory.supplier_id || ""}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      supplier_id: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Без поставщика</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}