"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useSections } from "@/store/useStore";
import { useToast } from "@/components/ui/Toast";
import { BottomSheet, FormInput, FormSelect, FormButton } from "@/components/ui/BottomSheet";
import { DepartmentSettingsModal } from "@/components/department/DepartmentSettingsModal";
import { QuantityInput } from "@/components/ui/QuantityInput";
import { api } from "@/lib/api-client";

interface Product {
  id: number;
  name: string;
  unit: string;
  category_id?: number;
  category_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  is_active: boolean;
  poster_ingredient_id?: string;
}

interface Supplier {
  id: number;
  name: string;
  phone?: string;
}

interface Category {
  id: number;
  name: string;
  supplier_id?: number;
}

interface ProductQuantity {
  [productId: number]: number;
}

function CustomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const cart = useCart();
  const sectionsStore = useSections();
  const toast = useToast();

  const sectionId = searchParams.get("section_id");
  const dept = searchParams.get("dept");

  const isAdmin = session?.user?.role === "admin";
  const isManager = session?.user?.role === "manager";
  const canManage = isAdmin || isManager;

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});

  // Last Order state
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [loadingLastOrder, setLoadingLastOrder] = useState(true);

  // Caching state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", unit: "шт", category_id: "" });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Current section data for settings modal
  const [currentSection, setCurrentSection] = useState<any>(null);
  
  // Pending orders count for this department (managers only)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
    if (!sectionId) {
      router.push("/");
      return;
    }
    loadData();
  }, [sectionId]);

  // Fetch last order for this section
  useEffect(() => {
    const fetchLastOrder = async () => {
      if (!sectionId) return;
      
      try {
        setLoadingLastOrder(true);
        const response = await fetch(`/api/orders?section_id=${sectionId}&my=true&limit=1`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setLastOrder(data.data[0]);
        }
      } catch (error) {
        console.error("Error loading last order:", error);
      } finally {
        setLoadingLastOrder(false);
      }
    };

    fetchLastOrder();
  }, [sectionId]);

  // Helper functions for Last Order card
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Ожидает";
      case "sent": return "Отправлен";
      case "delivered": return "Доставлен";
      case "cancelled": return "Отменен";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatRelativeDate = (date: Date | string) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return "вчера";
    return orderDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sectionsRes, productsRes, suppliersRes, categoriesRes, ordersRes] = await Promise.all([
        fetch("/api/sections"),
        fetch(`/api/section-products?section_id=${sectionId}&active=true`),
        fetch("/api/suppliers"),
        fetch("/api/categories"),
        canManage ? fetch("/api/orders?all=true") : Promise.resolve(null),
      ]);

      const sectionsData = await sectionsRes.json();
      let currentSectionName = "";
      if (sectionsData.success) {
        const section = sectionsData.data.find(
          (s: any) => s.id === Number(sectionId)
        );
        if (section) {
          currentSectionName = section.name;
          setSectionName(section.name);
          setCurrentSection(section);
          sectionsStore.setCurrent(section);
        }
      }

      const productsData = await productsRes.json();
      if (productsData.success) {
        setAllProducts(productsData.data);
        setProducts(productsData.data);
        setDataLoaded(true);
      }

      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) {
        setAllSuppliers(suppliersData.data);
        setSuppliers(suppliersData.data);
      }

      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
        setAllCategories(categoriesData.data);
        setCategories(categoriesData.data);
      }

      // Load pending orders count for this department (managers only)
      if (ordersRes && currentSectionName) {
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          const pendingCount = ordersData.data.filter(
            (o: any) => (o.status === "pending" || o.status === "sent") && 
                        o.order_data?.department === currentSectionName
          ).length;
          setPendingOrdersCount(pendingCount);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // === CRUD Operations ===
  
  // Handlers for suppliers/categories removed as they are now managed in /suppliers-categories
  // Keeping product handlers...

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      toast.error("Введите название товара");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post("/api/section-products", {
        name: productForm.name,
        unit: productForm.unit,
        section_id: Number(sectionId),
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        is_active: true,
      });

      if (data.success) {
        toast.success("Товар добавлен");
        // Reload to get fresh data with supplier info
        await loadData();
        setShowProductModal(false);
        setProductForm({ name: "", unit: "шт", category_id: "" });
      } else {
        toast.error(data.error || "Ошибка создания");
      }
    } catch (error) {
      toast.error("Ошибка создания товара");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    
    try {
      const data = await api.delete(`/api/section-products?id=${id}`);
      
      if (data.success) {
        toast.success("Товар удален");
        setProducts(products.filter(p => p.id !== id));
      } else {
        toast.error(data.error || "Ошибка удаления");
      }
    } catch (error) {
      toast.error("Ошибка удаления товара");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      unit: product.unit,
      category_id: product.category_id ? String(product.category_id) : "",
    });
    setShowProductModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productForm.name.trim()) {
      toast.error("Введите название товара");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.patch(`/api/section-products?id=${editingProduct.id}`, {
        name: productForm.name,
        unit: productForm.unit,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
      });

      if (data.success) {
        toast.success("Товар обновлен");
        await loadData();
        setShowProductModal(false);
        setEditingProduct(null);
        setProductForm({ name: "", unit: "шт", category_id: "" });
      } else {
        toast.error(data.error || "Ошибка обновления");
      }
    } catch (error) {
      toast.error("Ошибка обновления товара");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products by search query only (no supplier filtering)
  const currentProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allProducts, searchQuery]);

  const handleSetQuantity = (product: Product, newQty: number) => {
    if (newQty <= 0) {
      setProductQuantities((prev) => {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      });
      const cartId = `product-${product.id}`;
      cart.remove(cartId);
    } else {
      setProductQuantities((prev) => ({
        ...prev,
        [product.id]: newQty,
      }));

      const cartId = `product-${product.id}`;
      const existingItem = cart.items.find((item) => item.cartId === cartId);

      if (existingItem) {
        cart.updateQuantity(cartId, newQty);
      } else {
        cart.add({
          cartId,
          productId: product.id,
          name: product.name,
          quantity: newQty,
          unit: product.unit,
          category: product.category_name,
          supplier: product.supplier_name || "",
          supplier_id: product.supplier_id,
          poster_id: product.poster_ingredient_id,
        });
      }
    }
  };

  const handleIncreaseQuantity = (product: Product) => {
    const currentQty = productQuantities[product.id] || 0;
    const newQty = currentQty + 1;
    setProductQuantities((prev) => ({
      ...prev,
      [product.id]: newQty,
    }));

    const cartId = `product-${product.id}`;
    const existingItem = cart.items.find((item) => item.cartId === cartId);

    if (existingItem) {
      cart.updateQuantity(cartId, existingItem.quantity + 1);
    } else {
      cart.add({
        cartId,
        productId: product.id,
        name: product.name,
        quantity: 1,
        unit: product.unit,
        category: product.category_name,
        supplier: product.supplier_name || "",
        supplier_id: product.supplier_id,
        poster_id: product.poster_ingredient_id,
      });
    }
  };

  const handleDecreaseQuantity = (product: Product) => {
    const currentQty = productQuantities[product.id] || 0;
    const newQty = currentQty - 1;

    if (newQty <= 0) {
      setProductQuantities((prev) => {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setProductQuantities((prev) => ({
        ...prev,
        [product.id]: newQty,
      }));
    }

    const cartId = `product-${product.id}`;
    const cartItem = cart.items.find((item) => item.cartId === cartId);

    if (cartItem && cartItem.quantity > 1) {
      cart.updateQuantity(cartId, cartItem.quantity - 1);
    } else if (cartItem) {
      cart.remove(cartId);
    }
  };

  // === RENDER: Loading State ===
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  // === RENDER: No Suppliers (First Time Setup) - but show products if they exist ===
  if (suppliers.length === 0 && products.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          pendingOrdersCount={pendingOrdersCount}
          onAddSupplier={() => router.push('/suppliers-categories')}
        />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-6">🏢</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Нет поставщиков
          </h2>
          <p className="text-gray-500 mb-6">
            Создайте первого поставщика, чтобы начать добавлять товары
          </p>
          {canManage ? (
            <Link
              href="/suppliers-categories"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">+</span>
              Создать поставщика
            </Link>
          ) : (
            <p className="text-sm text-gray-400">
              Обратитесь к менеджеру для настройки
            </p>
          )}
        </main>
      </div>
    );
  }

  // === RENDER: Normal View (Products) ===
  return (
    <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          pendingOrdersCount={pendingOrdersCount}
          onAddSupplier={() => router.push('/suppliers-categories')}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

      {/* Last Order Card - Department Specific */}
      {lastOrder && !loadingLastOrder && (
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">📋 Последний заказ</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lastOrder.status)}`}>
                {getStatusLabel(lastOrder.status)}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              <span className="font-medium">{lastOrder.order_data.department || sectionName}</span>
              <span className="mx-2">•</span>
              <span>{lastOrder.order_data.items?.length || 0} товаров</span>
              <span className="mx-2">•</span>
              <span>{formatRelativeDate(lastOrder.created_at)}</span>
            </div>
            <div className="text-xs text-gray-500 truncate mb-2">
              {lastOrder.order_data.items?.slice(0, 3).map((item: any) => item.name).join(", ")}
              {(lastOrder.order_data.items?.length || 0) > 3 && "..."}
            </div>
            <Link
              href="/orders"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              Все заказы
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
            placeholder="🔍 Поиск товаров..."
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Products List */}
      <main className="max-w-md mx-auto px-4 pb-24">
        {currentProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? "Товары не найдены" : "Нет товаров в этом отделе"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {currentProducts.map((product) => {
              const quantity = productQuantities[product.id] || 0;
              const hasQuantity = quantity > 0;

              return (
                <div key={product.id} className="bg-white py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                      {product.category_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{product.category_name}</p>
                      )}
                    </div>

                    {!hasQuantity ? (
                      <button
                        onClick={() => handleIncreaseQuantity(product)}
                        className="ml-3 w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    ) : (
                      <div className="ml-3">
                        <QuantityInput
                          productName={product.name}
                          quantity={quantity}
                          unit={product.unit}
                          onQuantityChange={(newQty) => handleSetQuantity(product, newQty)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart FAB */}
      {cart.count > 0 && (
        <div className="fixed bottom-4 right-4">
          <Link
            href="/cart"
            className="flex items-center justify-center w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
          >
            <span className="text-xl">🛒</span>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {cart.count}
            </span>
          </Link>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
          setProductForm({ name: "", unit: "шт", category_id: "" });
        }}
        form={productForm}
        setForm={setProductForm}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        submitting={submitting}
        categories={categories}
      />
      
      {/* Department Settings Modal */}
      {currentSection && (
        <DepartmentSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          section={currentSection}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

// === Header Component ===
function Header({
  sectionName,
  dept,
  canManage,
  pendingOrdersCount,
  onAddSupplier,
  onOpenSettings,
}: {
  sectionName: string;
  dept: string | null;
  canManage: boolean;
  pendingOrdersCount: number;
  onAddSupplier: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="relative flex items-center justify-between">
          {/* Back button - Only show for admin/manager */}
          {canManage ? (
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
              aria-label="На главную"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          ) : (
            <div className="w-10 h-10" /> /* Spacer for non-admin users */
          )}

          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 truncate max-w-[200px] text-center">
            {sectionName || dept || "Товары"}
          </h1>

          <div className="flex items-center gap-2">
            {canManage && pendingOrdersCount > 0 && (
              <Link
                href="/orders"
                className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center hover:bg-yellow-200 transition-colors text-yellow-700 font-bold text-sm relative"
              >
                {pendingOrdersCount}
              </Link>
            )}
            
            {canManage && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// === Supplier Tabs Component ===
function SupplierTabs({
  suppliers,
  selectedId,
  onSelect,
  productCounts,
}: {
  suppliers: Supplier[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  productCounts: Record<number, number>;
}) {
  if (suppliers.length === 0) return null;

  return (
    <div className="bg-gray-50 border-b">
      <div className="max-w-md mx-auto">
        <div className="flex gap-1 overflow-x-auto py-3 px-4 scrollbar-hide">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="relative flex items-center">
              <button
                onClick={() => onSelect(supplier.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedId === supplier.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {supplier.name}
                {productCounts[supplier.id] > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedId === supplier.id
                        ? "bg-purple-500"
                        : "bg-gray-100"
                    }`}
                  >
                    {productCounts[supplier.id]}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: { name: string; unit: string; category_id: string };
  setForm: (form: { name: string; unit: string; category_id: string }) => void;
  onSubmit: () => void;
  submitting: boolean;
  categories: Category[];
}) {
  const unitOptions = [
    { value: "шт", label: "Штуки" },
    { value: "кг", label: "Килограммы" },
    { value: "л", label: "Литры" },
    { value: "уп", label: "Упаковки" },
    { value: "бут", label: "Бутылки" },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Новый товар">
      <FormInput
        label="Название"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
        placeholder="Например: Яблоки"
        required
        autoFocus
      />
      <FormSelect
        label="Единица измерения"
        value={form.unit}
        onChange={(v) => setForm({ ...form, unit: v })}
        options={unitOptions}
      />
      {categories.length > 0 && (
        <FormSelect
          label="Категория"
          value={form.category_id}
          onChange={(v) => setForm({ ...form, category_id: v })}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Выберите категорию"
        />
      )}
      <div className="mt-6">
        <FormButton onClick={onSubmit} loading={submitting}>
          Добавить товар
        </FormButton>
      </div>
    </BottomSheet>
  );
}

export default function CustomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
        </div>
      }
    >
      <CustomPageContent />
    </Suspense>
  );
}
