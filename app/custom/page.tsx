"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useSections } from "@/store/useStore";

interface Product {
  id: number;
  name: string;
  unit: string;
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

interface ProductQuantity {
  [productId: number]: number;
}

function CustomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const cart = useCart();
  const sectionsStore = useSections();

  const sectionId = searchParams.get("section_id");
  const dept = searchParams.get("dept");

  const isAdmin = session?.user?.role === "admin";
  const isManager = session?.user?.role === "manager";
  const canManage = isAdmin || isManager;

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});

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
      const [sectionsRes, productsRes, suppliersRes] = await Promise.all([
        fetch("/api/sections"),
        fetch(`/api/section-products?section_id=${sectionId}&active=true`),
        fetch("/api/suppliers"),
      ]);

      const sectionsData = await sectionsRes.json();
      if (sectionsData.success) {
        const section = sectionsData.data.find(
          (s: any) => s.id === Number(sectionId)
        );
        if (section) {
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
        // Auto-select first supplier that has products, or first supplier
        if (suppliersData.data.length > 0 && productsData.success) {
          const supplierWithProducts = suppliersData.data.find((s: Supplier) =>
            productsData.data.some((p: Product) => p.supplier_id === s.id)
          );
          setSelectedSupplierId(
            supplierWithProducts?.id || suppliersData.data[0].id
          );
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
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

  // === RENDER: No Suppliers (First Time Setup) ===
  if (suppliers.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          sectionId={sectionId}
          showAddSupplier={false}
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
              href="/manager?tab=suppliers&action=create"
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

  // === RENDER: Suppliers Exist but No Products Assigned ===
  if (suppliersWithProducts.length === 0 && products.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          sectionName={sectionName}
          dept={dept}
          canManage={canManage}
          sectionId={sectionId}
          showAddSupplier={canManage}
        />
        <SupplierTabs
          suppliers={suppliers}
          selectedId={selectedSupplierId}
          onSelect={setSelectedSupplierId}
          productCounts={{}}
          canManage={canManage}
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
            <Link
              href={`/manager?tab=products&action=create&section_id=${sectionId}`}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">+</span>
              Добавить товар
            </Link>
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
        sectionId={sectionId}
        showAddSupplier={canManage}
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
        canManage={canManage}
      />

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
          <Link
            href={`/manager?tab=products&action=create&section_id=${sectionId}&supplier_id=${selectedSupplierId}`}
            className="flex items-center gap-2 w-full py-3 px-4 mb-3 border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-lg text-gray-500 hover:text-purple-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Добавить товар</span>
          </Link>
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
    </div>
  );
}

// === Header Component ===
function Header({
  sectionName,
  dept,
  canManage,
  sectionId,
  showAddSupplier,
}: {
  sectionName: string;
  dept: string | null;
  canManage: boolean;
  sectionId: string | null;
  showAddSupplier: boolean;
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

        <h1 className="flex-1 text-center text-lg font-semibold truncate px-2">
          {sectionName || dept || "Товары"}
        </h1>

        {showAddSupplier ? (
          <Link
            href="/manager?tab=suppliers&action=create"
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
          </Link>
        ) : (
          <div className="w-10" /> // Spacer for centering
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
  canManage,
}: {
  suppliers: Supplier[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  productCounts: Record<number, number>;
  canManage: boolean;
}) {
  if (suppliers.length === 0) return null;

  return (
    <div className="bg-gray-50 border-b">
      <div className="max-w-md mx-auto">
        <div className="flex gap-1 overflow-x-auto py-3 px-4 scrollbar-hide">
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
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
          ))}
        </div>
      </div>
    </div>
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
