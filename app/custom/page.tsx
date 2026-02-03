"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useSections } from "@/store/useStore";
import { useToast } from "@/components/ui/Toast";
import { BottomSheet, FormInput, FormSelect, FormButton } from "@/components/ui/BottomSheet";

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
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "" });
  const [productForm, setProductForm] = useState({ name: "", unit: "шт", category_id: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  
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
        if (suppliersData.data.length > 0 && productsData.success) {
          const supplierWithProducts = suppliersData.data.find((s: Supplier) =>
            productsData.data.some((p: Product) => p.supplier_id === s.id)
          );
          setSelectedSupplierId(
            supplierWithProducts?.id || suppliersData.data[0].id
          );
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

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error("Введите название поставщика");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Поставщик создан");
        setSuppliers([...suppliers, data.data]);
        setSelectedSupplierId(data.data.id);
        setShowSupplierModal(false);
        setSupplierForm({ name: "", phone: "" });
      } else {
        toast.error(data.error || "Ошибка создания");
      }
    } catch (error) {
      toast.error("Ошибка создания поставщика");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Удалить поставщика? Это также удалит связь с товарами.")) return;
    
    try {
      const response = await fetch(`/api/suppliers?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Поставщик удален");
        setSuppliers(suppliers.filter(s => s.id !== id));
        if (selectedSupplierId === id) {
          setSelectedSupplierId(suppliers.find(s => s.id !== id)?.id || null);
        }
      } else {
        toast.error(data.error || "Ошибка удаления");
      }
    } catch (error) {
      toast.error("Ошибка удаления поставщика");
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Введите название категории");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name,
          supplier_id: selectedSupplierId,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Категория создана");
        setCategories([...categories, data.data]);
        setShowCategoryModal(false);
        setCategoryForm({ name: "" });
      } else {
        toast.error(data.error || "Ошибка создания");
      }
    } catch (error) {
      toast.error("Ошибка создания категории");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Удалить категорию?")) return;
    
    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success("Категория удалена");
        setCategories(categories.filter(c => c.id !== id));
      } else {
        toast.error(data.error || "Ошибка удаления");
      }
    } catch (error) {
      toast.error("Ошибка удаления категории");
    }
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      toast.error("Введите название товара");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/section-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          unit: productForm.unit,
          section_id: Number(sectionId),
          category_id: productForm.category_id ? Number(productForm.category_id) : null,
          is_active: true,
        }),
      });
      const data = await response.json();

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
      const response = await fetch(`/api/section-products?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
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
      const response = await fetch(`/api/section-products?id=${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          unit: productForm.unit,
          category_id: productForm.category_id ? Number(productForm.category_id) : null,
        }),
      });
      const data = await response.json();

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
    let filtered = productsBySupplier.grouped[selectedSupplierId] || [];

    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [selectedSupplierId, productsBySupplier, searchQuery]);

  // Suppliers that have products in this section
  const suppliersWithProducts = useMemo(() => {
    return suppliers.filter(
      (s) => productsBySupplier.grouped[s.id]?.length > 0
    );
  }, [suppliers, productsBySupplier]);

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
          editMode={editMode}
          pendingOrdersCount={pendingOrdersCount}
          onToggleEditMode={() => setEditMode(!editMode)}
          onAddSupplier={() => setShowSupplierModal(true)}
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
            <button
              onClick={() => setShowSupplierModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">+</span>
              Создать поставщика
            </button>
          ) : (
            <p className="text-sm text-gray-400">
              Обратитесь к менеджеру для настройки
            </p>
          )}
        </main>

        {/* Supplier Modal */}
        <BottomSheet
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          title="Новый поставщик"
        >
          <FormInput
            label="Название"
            value={supplierForm.name}
            onChange={(v) => setSupplierForm({ ...supplierForm, name: v })}
            placeholder="Например: Оптовая база"
          />
          <FormInput
            label="Телефон (WhatsApp)"
            value={supplierForm.phone}
            onChange={(v) => setSupplierForm({ ...supplierForm, phone: v })}
            placeholder="+7 XXX XXX XX XX"
          />
          <FormButton onClick={handleCreateSupplier} loading={submitting}>
            Создать
          </FormButton>
        </BottomSheet>
      </div>
    );
  }

  // === RENDER: No Suppliers but Products exist (synced from Poster) ===
  if (suppliers.length === 0 && products.length > 0) {
    // Filter products by search when no suppliers
    const ungroupedFilteredProducts = products.filter((p) =>
      searchQuery.trim()
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

    return (
      <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          editMode={editMode}
          pendingOrdersCount={pendingOrdersCount}
          onToggleEditMode={() => setEditMode(!editMode)}
          onAddSupplier={() => setShowSupplierModal(true)}
        />

        {/* Info banner for managers */}
        {canManage && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
            <div className="max-w-md mx-auto flex items-center gap-2 text-sm text-blue-700">
              <span>💡</span>
              <span>Создайте поставщиков и категории для группировки товаров</span>
              <button
                onClick={() => setShowSupplierModal(true)}
                className="ml-auto text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                + Поставщик
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
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
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Ungrouped Products List */}
        <main className="max-w-md mx-auto px-4 pb-24">
          {ungroupedFilteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery ? "Товары не найдены" : "Нет товаров"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {ungroupedFilteredProducts.map((product) => {
                const quantity = productQuantities[product.id] || 0;
                const hasQuantity = quantity > 0;

                return (
                  <div
                    key={product.id}
                    className="bg-white py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {product.name}
                        </h3>
                        {product.category_name && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {product.category_name}
                          </p>
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
                            className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-xl font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {quantity}
                          </span>
                          <button
                            onClick={() => handleIncreaseQuantity(product)}
                            className="w-9 h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xl font-bold"
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
        <SupplierModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          form={supplierForm}
          setForm={setSupplierForm}
          onSubmit={handleCreateSupplier}
          submitting={submitting}
        />
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
      </div>
    );
  }

  // === RENDER: Suppliers Exist but No Products Assigned ===
  if (suppliersWithProducts.length === 0 && products.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          editMode={editMode}
          pendingOrdersCount={pendingOrdersCount}
          onToggleEditMode={() => setEditMode(!editMode)}
          onAddSupplier={() => setShowSupplierModal(true)}
        />
        <SupplierTabs
          suppliers={suppliers}
          selectedId={selectedSupplierId}
          onSelect={setSelectedSupplierId}
          productCounts={{}}
          editMode={editMode}
          onDelete={handleDeleteSupplier}
          onAddNew={() => setShowSupplierModal(true)}
        />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-6">📦</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Нет товаров
          </h2>
          <p className="text-gray-500 mb-6">
            Добавьте товары для этого отдела
          </p>
          {canManage && (
            <button
              onClick={() => setShowProductModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">+</span>
              Добавить товар
            </button>
          )}
        </main>

        {/* Modals */}
        <SupplierModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          form={supplierForm}
          setForm={setSupplierForm}
          onSubmit={handleCreateSupplier}
          submitting={submitting}
        />
        <ProductModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          form={productForm}
          setForm={setProductForm}
          onSubmit={handleCreateProduct}
          submitting={submitting}
          categories={categoriesForSupplier}
        />
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
        editMode={editMode}
        pendingOrdersCount={pendingOrdersCount}
        onToggleEditMode={() => setEditMode(!editMode)}
        onAddSupplier={() => setShowSupplierModal(true)}
      />

      {/* Supplier Tabs */}
      <SupplierTabs
        suppliers={suppliersWithProducts}
        selectedId={selectedSupplierId}
        onSelect={setSelectedSupplierId}
        productCounts={Object.fromEntries(
          Object.entries(productsBySupplier.grouped).map(([id, prods]) => [
            id,
            prods.length,
          ])
        )}
        editMode={editMode}
        onDelete={handleDeleteSupplier}
        onAddNew={() => setShowSupplierModal(true)}
      />

      {/* Category Chips (Edit Mode) */}
      {editMode && canManage && (
        <div className="bg-white border-b">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">Категории:</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {categoriesForSupplier.map((category) => (
                <div key={category.id} className="relative flex items-center">
                  <span className="px-3 py-1.5 pr-7 rounded-full text-sm bg-gray-100 text-gray-700 whitespace-nowrap">
                    {category.name}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 whitespace-nowrap"
              >
                <span>+</span>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
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
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Products List */}
      <main className="max-w-md mx-auto px-4 pb-24">
        {/* Add Product Button (for admin/manager) */}
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
                <div
                  key={product.id}
                  className="bg-white py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      {product.category_name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {product.category_name}
                        </p>
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
                        <span className="w-10 text-center font-medium text-gray-900">
                          {quantity}
                        </span>
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
      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        form={supplierForm}
        setForm={setSupplierForm}
        onSubmit={handleCreateSupplier}
        submitting={submitting}
      />
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        form={productForm}
        setForm={setProductForm}
        onSubmit={handleCreateProduct}
        submitting={submitting}
        categories={categoriesForSupplier}
      />
    </div>
  );
}

// === Header Component ===
function Header({
  sectionName,
  dept,
  canManage,
  editMode,
  pendingOrdersCount,
  onToggleEditMode,
  onAddSupplier,
}: {
  sectionName: string;
  dept: string | null;
  canManage: boolean;
  editMode: boolean;
  pendingOrdersCount: number;
  onToggleEditMode: () => void;
  onAddSupplier: () => void;
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
            {editMode ? (
              <button
                onClick={onToggleEditMode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all text-sm font-medium"
              >
                <span>✓</span>
                <span>Готово</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onAddSupplier}
                  className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95"
                  title="Добавить поставщика"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                <button
                  onClick={onToggleEditMode}
                  className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95"
                  title="Режим редактирования"
                >
                  <span className="text-lg">✏️</span>
                </button>
              </>
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
  editMode,
  onDelete,
  onAddNew,
}: {
  suppliers: Supplier[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  productCounts: Record<number, number>;
  editMode?: boolean;
  onDelete?: (id: number) => void;
  onAddNew?: () => void;
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
                } ${editMode ? "pr-8" : ""}`}
              >
                {supplier.name}
                {productCounts[supplier.id] > 0 && !editMode && (
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
              {editMode && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(supplier.id);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {editMode && onAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white text-purple-600 hover:bg-purple-50 border-2 border-dashed border-purple-300"
            >
              <span>+</span>
              Добавить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// === Supplier Modal ===
function SupplierModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: { name: string; phone: string };
  setForm: (form: { name: string; phone: string }) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Новый поставщик">
      <FormInput
        label="Название"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
        placeholder="Например: Фрукт-Алма"
        required
        autoFocus
      />
      <FormInput
        label="Телефон (WhatsApp)"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
        placeholder="+7 777 123 4567"
        type="tel"
      />
      <div className="mt-6">
        <FormButton onClick={onSubmit} loading={submitting}>
          Создать поставщика
        </FormButton>
      </div>
    </BottomSheet>
  );
}

// === Product Modal ===
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
