"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useSections } from "@/store/useStore";
import { useToast } from "@/components/ui/Toast";
import { BottomSheet, FormInput, FormSelect, FormButton } from "@/components/ui/BottomSheet";
import { DepartmentSettingsModal } from "@/components/department/DepartmentSettingsModal";
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
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});

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
        setProducts(productsData.data);
      }

      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) {
        setSuppliers(suppliersData.data);
        
        // Auto-select first supplier or "Other" if no suppliers
        if (!selectedSupplierId) {
          if (suppliersData.data.length > 0) {
            // Try to find supplier with products
            const supplierWithProducts = suppliersData.data.find((s: Supplier) =>
              productsData.data.some((p: Product) => p.supplier_id === s.id)
            );
            setSelectedSupplierId(supplierWithProducts?.id || suppliersData.data[0].id);
          } else if (productsData.data.some((p: Product) => !p.supplier_id)) {
            // No suppliers but have unassigned products -> select "Other"
            setSelectedSupplierId(-1);
          }
        }
      }

      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) {
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

  // Group products by supplier
  const productsBySupplier = useMemo(() => {
    const grouped: Record<number, Product[]> = {};
    const noSupplier: Product[] = [];

    products.forEach((product) => {
      if (product.supplier_id) {
        if (!grouped[product.supplier_id]) {
          grouped[product.supplier_id] = [];
        }
        grouped[product.supplier_id].push(product);
      } else {
        noSupplier.push(product);
      }
    });

    return { grouped, noSupplier };
  }, [products]);

  // Filter products for selected supplier
  const currentProducts = useMemo(() => {
    if (!selectedSupplierId) return [];
    
    let filtered: Product[] = [];
    
    if (selectedSupplierId === -1) {
      filtered = productsBySupplier.noSupplier;
    } else {
      filtered = productsBySupplier.grouped[selectedSupplierId] || [];
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [selectedSupplierId, productsBySupplier, searchQuery]);

  // Suppliers that have products in this section
  // Managers see all suppliers, others see only those with products
  const visibleSuppliers = useMemo(() => {
    let list = canManage ? [...suppliers] : suppliers.filter(
      (s) => productsBySupplier.grouped[s.id]?.length > 0
    );

    // Add "Other" tab if there are products with no supplier
    if (productsBySupplier.noSupplier.length > 0) {
      list.push({
        id: -1,
        name: "Разное",
        phone: ""
      });
    }

    return list;
  }, [suppliers, productsBySupplier, canManage]);

  // Categories for selected supplier (for product form)
  const categoriesForSupplier = useMemo(() => {
    if (!selectedSupplierId) return categories;
    return categories.filter(
      (c) => c.supplier_id === selectedSupplierId || !c.supplier_id
    );
  }, [categories, selectedSupplierId]);

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

  // === RENDER: Normal View (Suppliers + Products) ===
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

      {/* Supplier Tabs */}
      <SupplierTabs
        suppliers={visibleSuppliers}
        selectedId={selectedSupplierId}
        onSelect={setSelectedSupplierId}
        productCounts={Object.fromEntries([
          ...Object.entries(productsBySupplier.grouped).map(([id, prods]) => [
            id,
            prods.length,
          ]),
          ['-1', productsBySupplier.noSupplier.length]
        ])}
      />

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
        {canManage && (
          <button
            onClick={() => setShowProductModal(true)}
            className="flex items-center gap-2 w-full py-3 px-4 mb-3 border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-lg text-gray-500 hover:text-purple-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Добавить товар</span>
          </button>
        )}

        {currentProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? "Товары не найдены" : "Нет товаров у этого поставщика"}
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
                        className="ml-3 w-9 h-9 flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-xl font-bold"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleDecreaseQuantity(product)}
                          className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors text-xl font-bold"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-medium text-gray-900">{quantity}</span>
                        <button
                          onClick={() => handleIncreaseQuantity(product)}
                          className="w-9 h-9 flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-xl font-bold"
                        >
                          +
                        </button>
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
        categories={categoriesForSupplier}
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
    <header className="bg-purple-600 text-white px-4 py-4">
      <div className="max-w-md mx-auto flex items-center">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>

        <div className="flex-1 text-center px-2">
          <h1 className="text-lg font-semibold truncate">
            {sectionName || dept || "Товары"}
          </h1>
          {canManage && pendingOrdersCount > 0 && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white"
            >
              <span className="bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded-full text-xs font-medium">
                {pendingOrdersCount}
              </span>
              <span>активных заказов</span>
            </Link>
          )}
        </div>

        {canManage ? (
          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95"
                title="Настройки отдела"
              >
                <span className="text-lg">⚙️</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-10" />
        )}
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
