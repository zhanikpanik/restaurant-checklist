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

interface SupplierFormData {
  id?: number;
  name: string;
  phone: string;
  contact_info: string;
}

interface CategoryFormData {
  id?: number;
  name: string;
  supplier_id: number | null;
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
  const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierFormData | null>(null);

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
    let message = `🛒 *Заказ от ${restaurant.current?.name || "Ресторан"}*\n\n`;
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
      const url = "/api/categories";
      const method = editingCategory.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
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

  const handleCreateCategory = () => {
    setEditingCategory({
      name: "",
      supplier_id: null,
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Удалить эту категорию?")) return;

    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setCategories(categories.filter(c => c.id !== categoryId));
      } else {
        alert(data.error || "Ошибка при удалении категории");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Ошибка при удалении категории");
    }
  };

  const handleCreateSupplier = () => {
    setEditingSupplier({
      name: "",
      phone: "",
      contact_info: "",
    });
    setShowSupplierModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone || "",
      contact_info: supplier.contact_info || "",
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;

    try {
      const url = "/api/suppliers";
      const method = editingSupplier.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSupplier),
      });

      const data = await response.json();

      if (data.success) {
        setShowSupplierModal(false);
        setEditingSupplier(null);
        loadData(); // Reload suppliers
      } else {
        alert(data.error || "Ошибка при сохранении поставщика");
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Ошибка при сохранении поставщика");
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if (!confirm("Удалить этого поставщика?")) return;

    try {
      const response = await fetch(`/api/suppliers?id=${supplierId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setSuppliers(suppliers.filter(s => s.id !== supplierId));
      } else {
        alert(data.error || "Ошибка при удалении поставщика");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Ошибка при удалении поставщика");
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
                <div className="p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 px-2 md:px-0">
                    Все заказы ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет заказов
                    </p>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="space-y-3 md:hidden">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all shadow-sm"
                          >
                            {/* Header Row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-900">
                                  #{order.id}
                                </span>
                                {getStatusBadge(order.status)}
                              </div>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Дата</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Товаров</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.order_data.items?.length || 0} шт
                                </p>
                              </div>
                              {order.order_data.department && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500 mb-1">Отдел</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {order.order_data.department}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Просмотреть заказ
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Отдел</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Товаров</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr
                                key={order.id}
                                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-3 px-4 font-semibold text-gray-900">#{order.id}</td>
                                <td className="py-3 px-4 text-gray-700">{formatDate(order.created_at)}</td>
                                <td className="py-3 px-4 text-gray-700">{order.order_data.department || "—"}</td>
                                <td className="py-3 px-4 text-gray-700">{order.order_data.items?.length || 0} шт</td>
                                <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleViewOrder(order)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Просмотреть
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Suppliers Tab */}
              {activeTab === "suppliers" && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                      Поставщики ({suppliers.length})
                    </h2>
                    <button
                      onClick={handleCreateSupplier}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ➕ Добавить поставщика
                    </button>
                  </div>
                  {suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет поставщиков
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {suppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
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
                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={() => handleEditSupplier(supplier)}
                                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                              >
                                Редактировать
                              </button>
                              {!(supplier as any).poster_supplier_id && (
                                <button
                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                  className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                  Удалить
                                </button>
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
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-4 px-2">
                    Доставленные заказы ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет доставленных заказов
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm"
                        >
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-900">
                                #{order.id}
                              </span>
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                ✓ Доставлен
                              </span>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Дата доставки</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(order.delivered_at || order.created_at)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Товаров</p>
                              <p className="text-sm font-medium text-gray-900">
                                {order.order_data.items?.length || 0} шт
                              </p>
                            </div>
                            {order.order_data.department && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-1">Отдел</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.order_data.department}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="w-full bg-white hover:bg-gray-50 border-2 border-green-200 text-green-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                          >
                            Просмотр деталей
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === "categories" && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                      Категории товаров ({categories.length})
                    </h2>
                    <button
                      onClick={handleCreateCategory}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ➕ Добавить категорию
                    </button>
                  </div>
                  {categories.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет категорий
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
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
                            <div className="flex gap-2 ml-3">
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                              >
                                Редактировать
                              </button>
                              {!(category as any).poster_category_id && (
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                  Удалить
                                </button>
                              )}
                            </div>
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
                <div className="p-3 md:p-6">
                  <div className="flex justify-between items-center mb-4 md:mb-6 px-1 md:px-0">
                    <h2 className="text-base md:text-xl font-semibold">
                      Товары ({products.length})
                    </h2>
                    <button
                      onClick={handleCreateProduct}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1.5 md:gap-2"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добавить
                    </button>
                  </div>
                  {products.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Нет товаров
                    </p>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="space-y-2 md:hidden">
                        {products.map((product: any) => (
                          <div
                            key={product.id}
                            className={`border rounded-lg p-3 transition-all ${
                              product.poster_ingredient_id
                                ? "bg-blue-50 border-blue-200"
                                : "bg-white border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                  {product.name}
                                </h3>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    product.is_active
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {product.is_active ? "✓" : "○"}
                                  </span>
                                  {product.poster_ingredient_id && (
                                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                      📦
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-600">
                                    {product.category_name || "—"} • {product.unit || "—"}
                                  </span>
                                </div>
                              </div>
                              {!product.poster_ingredient_id && (
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
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Section Info */}
                            <div className="text-xs text-gray-500 mb-2">
                              📍 {product.section_name || "Без секции"}
                            </div>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                            >
                              Редактировать
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Название</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Категория</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Единица</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Секция</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((product: any) => (
                              <tr
                                key={product.id}
                                className={`border-b border-gray-200 transition-colors ${
                                  product.poster_ingredient_id ? "bg-blue-50" : "hover:bg-gray-50"
                                }`}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{product.name}</span>
                                    {product.poster_ingredient_id && (
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                                        📦 Poster
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-gray-700">{product.category_name || "—"}</td>
                                <td className="py-3 px-4 text-gray-700">{product.unit || "—"}</td>
                                <td className="py-3 px-4 text-gray-700">{product.section_name || "—"}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    product.is_active
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {product.is_active ? "✓ Активен" : "○ Неактивен"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditProduct(product)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Редактировать
                                    </button>
                                    {!product.poster_ingredient_id && (
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
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
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
      {/* Category Modal */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold">
                {editingCategory.id ? "Редактировать категорию" : "Создать категорию"}
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название категории
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      name: e.target.value
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Название"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Поставщик
                  </label>
                  <select
                    value={editingCategory.supplier_id || ""}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      supplier_id: e.target.value ? Number(e.target.value) : null
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

      {/* Supplier Modal */}
      {showSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold">
                {editingSupplier.id ? "Редактировать поставщика" : "Создать поставщика"}
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.name}
                    onChange={(e) => setEditingSupplier({
                      ...editingSupplier,
                      name: e.target.value
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Название"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({
                      ...editingSupplier,
                      phone: e.target.value
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="+7 XXX XXX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Контактная информация
                  </label>
                  <textarea
                    value={editingSupplier.contact_info}
                    onChange={(e) => setEditingSupplier({
                      ...editingSupplier,
                      contact_info: e.target.value
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Email, адрес, примечания..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowSupplierModal(false);
                      setEditingSupplier(null);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveSupplier}
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