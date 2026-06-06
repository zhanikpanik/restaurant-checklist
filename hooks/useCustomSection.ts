"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart, useSections } from "@/store/useStore";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { clientCache, fetchWithCache } from "@/lib/client-cache";

// ── Types ──────────────────────────────────────────────────
export interface CustomProduct {
  id: number;
  name: string;
  unit: string;
  category_id?: number;
  category_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  is_active: boolean;
  poster_ingredient_id?: string;
  // Extended fields (from API enrichment)
  pinned?: boolean;
  is_manual_check?: boolean;
  days_remaining?: number | null;
  stock_alert_days?: number;
  last_order_at?: string;
  last_order_qty?: number;
  stock?: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
}

export interface Category {
  id: number;
  name: string;
  supplier_id?: number;
}

export interface ProductForm {
  name: string;
  unit: string;
  category_id: string;
}

// ── Hook ───────────────────────────────────────────────────
export function useCustomSection() {
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

  // ── Core data ──────────────────────────────────────
  const [allProducts, setAllProducts] = useState<CustomProduct[]>(
    () => clientCache.get(`custom_products_${sectionId}`) || []
  );
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(
    () => clientCache.get("custom_suppliers") || []
  );
  const [allCategories, setAllCategories] = useState<Category[]>(
    () => clientCache.get("custom_categories") || []
  );
  const [dataLoaded, setDataLoaded] = useState(
    clientCache.has(`custom_products_${sectionId}`)
  );
  const [loading, setLoading] = useState(
    !clientCache.has(`custom_products_${sectionId}`)
  );

  // ── Derived: products/suppliers/categories (aliases for UI) ──
  const products = allProducts;
  const suppliers = allSuppliers;
  const categories = allCategories;

  // ── Section ─────────────────────────────────────────
  const [sectionName, setSectionName] = useState(dept || "");
  const [currentSection, setCurrentSection] = useState<any>(null);

  // ── Last order ──────────────────────────────────────
  const [lastOrder, setLastOrder] = useState<any>(
    () => clientCache.get(`custom_last_order_${sectionId}`) || null
  );
  const [loadingLastOrder, setLoadingLastOrder] = useState(
    !clientCache.has(`custom_last_order_${sectionId}`)
  );

  // ── Stock / leftovers ───────────────────────────────
  const [leftovers, setLeftovers] = useState<Record<string, number>>(
    () => clientCache.get("custom_leftovers") || {}
  );

  // ── Search ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Modals ──────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    unit: "шт",
    category_id: "",
  });
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // ── Counts ──────────────────────────────────────────
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [assignedUsersCount, setAssignedUsersCount] = useState(0);

  // ── Redirect if no sectionId ────────────────────────
  useEffect(() => {
    if (!sectionId) {
      router.push("/");
    }
  }, [sectionId]);

  // ── Load data ──────────────────────────────────────
  useEffect(() => {
    if (sectionId) loadData();
  }, [sectionId]);

  // ── Fetch last order ───────────────────────────────
  useEffect(() => {
    if (!sectionId) return;
    const fetchLastOrder = async () => {
      try {
        setLoadingLastOrder(true);
        const response = await fetch(
          `/api/orders?section_id=${sectionId}&limit=1`
        );
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setLastOrder(data.data[0]);
        } else {
          setLastOrder(null);
        }
      } catch (error) {
        console.error("Error loading last order:", error);
      } finally {
        setLoadingLastOrder(false);
      }
    };
    fetchLastOrder();
  }, [sectionId]);

  const loadData = async () => {
    if (!dataLoaded) setLoading(true);
    try {
      const [
        sectionsData,
        productsData,
        suppliersData,
        categoriesData,
        ordersData,
        leftoversData,
        usersData,
      ] = await Promise.all([
        fetchWithCache("/api/sections"),
        fetchWithCache(
          `/api/section-products?section_id=${sectionId}&active=true`
        ),
        fetchWithCache("/api/suppliers"),
        fetchWithCache("/api/categories"),
        canManage
          ? fetchWithCache("/api/orders?all=true")
          : Promise.resolve(null),
        fetchWithCache("/api/poster/leftovers"),
        canManage
          ? fetchWithCache(`/api/user-sections?section_id=${sectionId}`)
          : Promise.resolve(null),
      ]);

      let currentSectionName = "";
      if (sectionsData?.success) {
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

      if (productsData?.success) {
        setAllProducts(productsData.data);
        clientCache.set(`custom_products_${sectionId}`, productsData.data);
        setDataLoaded(true);
      }

      if (suppliersData?.success) {
        setAllSuppliers(suppliersData.data);
        clientCache.set("custom_suppliers", suppliersData.data);
      }

      if (categoriesData?.success) {
        setAllCategories(categoriesData.data);
        clientCache.set("custom_categories", categoriesData.data);
      }

      if (ordersData?.success && currentSectionName) {
        const pendingCount = ordersData.data.filter(
          (o: any) =>
            (o.status === "pending" || o.status === "sent") &&
            o.order_data?.department === currentSectionName
        ).length;
        setPendingOrdersCount(pendingCount);
      }

      if (leftoversData?.success) {
        setLeftovers(leftoversData.data);
        clientCache.set("custom_leftovers", leftoversData.data);
      }

      if (usersData?.success) {
        setAssignedUsersCount(usersData.data.length);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD: Create product ───────────────────────────
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
        category_id: productForm.category_id
          ? Number(productForm.category_id)
          : null,
        is_active: true,
      });
      if (data.success) {
        toast.success("Товар добавлен");
        await loadData();
        closeProductModal();
      } else {
        toast.error(data.error || "Ошибка создания");
      }
    } catch {
      toast.error("Ошибка создания товара");
    } finally {
      setSubmitting(false);
    }
  };

  // ── CRUD: Delete product ───────────────────────────
  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    try {
      const data = await api.delete(`/api/section-products?id=${id}`);
      if (data.success) {
        toast.success("Товар удален");
        setAllProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(data.error || "Ошибка удаления");
      }
    } catch {
      toast.error("Ошибка удаления товара");
    }
  };

  // ── CRUD: Edit product ─────────────────────────────
  const openEditProduct = (product: CustomProduct) => {
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
      const data = await api.patch(
        `/api/section-products?id=${editingProduct.id}`,
        {
          name: productForm.name,
          unit: productForm.unit,
          category_id: productForm.category_id
            ? Number(productForm.category_id)
            : null,
        }
      );
      if (data.success) {
        toast.success("Товар обновлен");
        await loadData();
        closeProductModal();
      } else {
        toast.error(data.error || "Ошибка обновления");
      }
    } catch {
      toast.error("Ошибка обновления товара");
    } finally {
      setSubmitting(false);
    }
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({ name: "", unit: "шт", category_id: "" });
  };

  // ── Product sections: InCart | Low | Rest ──────────────────
  const inCartIds = useMemo(() => {
    return new Set(
      cart.items
        .filter((item) => item.cartId?.startsWith("product-"))
        .map((item) => item.productId)
        .filter(Boolean) as number[]
    );
  }, [cart.items]);

  const sortProducts = (list: CustomProduct[]) => {
    return [...list].sort((a: any, b: any) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.is_manual_check && !b.is_manual_check) return -1;
      if (!a.is_manual_check && b.is_manual_check) return 1;
      const aDays = a.days_remaining ?? 999;
      const bDays = b.days_remaining ?? 999;
      if (aDays !== bDays) return aDays - bDays;
      return a.name.localeCompare(b.name);
    });
  };

  const { lowProducts, restProducts, currentProducts } = useMemo(() => {
    let filtered = allProducts;
    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const lowList: CustomProduct[] = [];
    const restList: CustomProduct[] = [];

    filtered.forEach((p: any) => {
      const alertDays = Math.min(p.stock_alert_days || 2, 30);
      const isLow = p.days_remaining != null && p.days_remaining < alertDays;
      if (isLow) {
        lowList.push(p);
      } else {
        restList.push(p);
      }
    });

    return {
      lowProducts: sortProducts(lowList),
      restProducts: sortProducts(restList),
      currentProducts: filtered,
    };
  }, [allProducts, searchQuery]);

  // ── Toggle product in cart (tap to add/remove, qty 1) ─
  const handleToggleCart = (product: CustomProduct) => {
    const cartId = `product-${product.id}`;
    const existing = cart.items.find((item) => item.cartId === cartId);
    if (existing) {
      cart.remove(cartId);
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



  // ── Return ─────────────────────────────────────────
  return {
    // Core
    sectionId,
    dept,
    isAdmin,
    isManager,
    canManage,
    loading,
    // Data
    products,
    suppliers,
    categories,
    sectionName,
    currentSection,
    lastOrder,
    loadingLastOrder,
    leftovers,
    pendingOrdersCount,
    assignedUsersCount,
    // Search
    searchQuery,
    setSearchQuery,
    // Derived
    currentProducts,
    lowProducts,
    restProducts,
    // Modals
    showProductModal,
    setShowProductModal,
    showSettingsModal,
    setShowSettingsModal,
    productForm,
    setProductForm,
    editingProduct,
    submitting,
    // CRUD
    handleCreateProduct,
    handleDeleteProduct,
    openEditProduct,
    handleUpdateProduct,
    closeProductModal,
    // Cart
    cart,
    handleToggleCart,
    // Data reload
    loadData,
    // Navigation
    router,
  };
}

// ── Shared utilities ───────────────────────────────────────
export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "sent":
      return "Отправлен";
    case "delivered":
      return "Доставлен";
    case "cancelled":
      return "Отменен";
    default:
      return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "sent":
      return "bg-brand-100 text-brand-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function formatRelativeDate(date: Date | string): string {
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
  return orderDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function translateUnit(u: string): string {
  const unitMap: Record<string, string> = {
    kg: "кг",
    l: "л",
    pcs: "шт",
    p: "шт",
    pt: "шт",
    unit: "шт",
    pack: "уп",
    bottle: "бут",
    can: "банка",
    portion: "порц",
    g: "г",
    ml: "мл",
  };
  return unitMap[u.toLowerCase()] || u;
}
