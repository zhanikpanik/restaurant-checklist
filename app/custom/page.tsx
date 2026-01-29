"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart, useSections } from "@/store/useStore";

interface Product {
  id: number;
  name: string;
  unit: string;
  category_name?: string;
  is_active: boolean;
  poster_ingredient_id?: string;
}

interface ProductQuantity {
  [productId: number]: number;
}

function CustomPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const sections = useSections();

  const sectionId = searchParams.get("section_id");
  const dept = searchParams.get("dept");

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
const [sectionName, setSectionName] = useState("");
  const [productQuantities, setProductQuantities] = useState<ProductQuantity>({});

  useEffect(() => {
    if (!sectionId) {
      router.push("/");
      return;
    }
    loadProducts();
  }, [sectionId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Load section info
      const sectionsRes = await fetch("/api/sections");
      const sectionsData = await sectionsRes.json();
      if (sectionsData.success) {
        const section = sectionsData.data.find(
          (s: any) => s.id === Number(sectionId)
        );
        if (section) {
          setSectionName(section.name);
          // Set current section in store
          sections.setCurrent(section);
        }
      }

      // Load products for this section
      const productsRes = await fetch("/api/section-products");
      const productsData = await productsRes.json();
      if (productsData.success) {
        const sectionProducts = productsData.data.filter(
          (p: any) => p.section_id === Number(sectionId) && p.is_active
        );
        setProducts(sectionProducts);
        setFilteredProducts(sectionProducts);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseQuantity = (product: Product) => {
    const newQty = (productQuantities[product.id] || 0) + 1;
    setProductQuantities((prev) => ({
      ...prev,
      [product.id]: newQty,
    }));

    // Add to cart immediately
    cart.add({
      cartId: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      quantity: 1,
      unit: product.unit,
      category: product.category_name,
      supplier: (product as any).supplier_name || "",
      supplier_id: (product as any).supplier_id,
      poster_id: product.poster_ingredient_id,
    });
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

    // Remove 1 from cart
    const cartItem = cart.items.find(item => item.productId === product.id);
    if (cartItem && cartItem.quantity > 1) {
      cart.updateQuantity(cartItem.cartId, cartItem.quantity - 1);
    } else if (cartItem) {
      cart.remove(cartItem.cartId);
    }
};

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-purple-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center relative">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-95 z-10"
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
          <h1 className="text-lg font-semibold absolute left-1/2 transform -translate-x-1/2">
            {sectionName || dept || "Товары"}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
{/* Search Field */}
        <div className="sticky top-0 z-10 bg-white pb-4 mb-4">
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
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
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
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? "Товары не найдены" : "Нет товаров"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const quantity = productQuantities[product.id] || 0;
              const hasQuantity = quantity > 0;

              return (
                <div
                  key={product.id}
                  className="bg-white p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
<div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                    </div>

                    {!hasQuantity ? (
                      <button
                        onClick={() => handleIncreaseQuantity(product)}
                        className="ml-3 w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors text-xl font-bold"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => handleDecreaseQuantity(product)}
                          className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors text-xl font-bold"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-medium text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleIncreaseQuantity(product)}
                          className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors text-xl font-bold"
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

      {/* Cart Button */}
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

export default function CustomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    }>
      <CustomPageContent />
    </Suspense>
  );
}
