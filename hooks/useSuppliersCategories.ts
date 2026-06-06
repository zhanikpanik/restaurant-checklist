"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { useCSRF } from "@/hooks/useCSRF";
import { clientCache, fetchWithCache } from "@/lib/client-cache";
import type { Supplier, Product } from "@/types";

// ── Hook ───────────────────────────────────────────────────
export function useSuppliersCategories() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { fetchWithCSRF } = useCSRF();

  const [selectedSupplierId, setSelectedSupplierId] = useState<
    string | number
  >("suppliers");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    () => clientCache.get("manager_suppliers") || []
  );
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [relatedIdsMap, setRelatedIdsMap] = useState<
    Record<number, number[]>
  >({});
  const [loading, setLoading] = useState(
    !clientCache.has("manager_suppliers")
  );
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>(
    () => clientCache.get("manager_all_products") || []
  );
  const [productsLoaded, setProductsLoaded] = useState(
    clientCache.has("manager_all_products")
  );

  const isAuthorized =
    status === "authenticated" &&
    ["admin", "manager"].includes(session?.user?.role || "");

  // ── Auth guard ────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return;
    if (
      status === "authenticated" &&
      !["admin", "manager"].includes(session?.user?.role || "")
    ) {
      router.replace("/");
    }
  }, [session, status, router]);

  // ── Count unassigned ──────────────────────────────
  useEffect(() => {
    if (isAuthorized && productsLoaded) {
      const count = allProducts.filter(
        (p: Product) => !p.supplier_id
      ).length;
      setUnassignedCount(count);
    }
  }, [isAuthorized, allProducts, productsLoaded]);

  // ── Load data ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [selectedSupplierId, isAuthorized]);

  const loadData = async () => {
    if (!suppliers.length || !productsLoaded) setLoading(true);
    try {
      const suppliersData = await fetchWithCache("/api/suppliers");
      if (suppliersData?.success) {
        setSuppliers(suppliersData.data);
        clientCache.set("manager_suppliers", suppliersData.data);
      }

      const productsData = await fetchWithCache(
        "/api/section-products?active=true"
      );
      if (productsData?.success) {
        setAllProducts(productsData.data);
        clientCache.set("manager_all_products", productsData.data);
        setProductsLoaded(true);
      }

      if (selectedSupplierId === "unsorted" && productsData?.success) {
        const unassigned = productsData.data.filter(
          (p: Product) => !p.supplier_id
        );
        const { products, idMap } = deduplicateProducts(unassigned);
        setUnassignedProducts(products);
        setRelatedIdsMap(idMap);
      } else if (
        typeof selectedSupplierId === "number" &&
        productsData?.success
      ) {
        setSupplierProducts(
          productsData.data.filter(
            (p: Product) => p.supplier_id === Number(selectedSupplierId)
          )
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  // ── Sync ──────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const suppliersRes = await fetchWithCSRF(
        "/api/poster/sync-suppliers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!suppliersRes.ok)
        throw new Error(`HTTP ${suppliersRes.status}`);
      const suppliersData = await suppliersRes.json();
      if (!suppliersData.success)
        throw new Error(
          suppliersData.error || "Ошибка синхронизации поставщиков"
        );

      const ingredientsRes = await fetchWithCSRF(
        "/api/sync-sections",
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!ingredientsRes.ok)
        throw new Error(`HTTP ${ingredientsRes.status}`);
      const ingredientsData = await ingredientsRes.json();
      if (!ingredientsData.success)
        throw new Error(
          ingredientsData.error || "Ошибка синхронизации ингредиентов"
        );

      const { syncedCount, ingredientsSynced } = ingredientsData.data;
      toast.success(
        `Синхронизировано: поставщики, ${syncedCount} отделов, ${ingredientsSynced || 0} товаров`
      );
      setProductsLoaded(false);
      loadData();
    } catch (error: any) {
      console.error("Error syncing:", error);
      toast.error(error.message || "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  // ── Global search ─────────────────────────────────
  const searchedProducts = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const lowerQuery = globalSearchQuery.toLowerCase();
    const matched = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.section_name &&
          p.section_name.toLowerCase().includes(lowerQuery)) ||
        (p.category_name &&
          p.category_name.toLowerCase().includes(lowerQuery))
    );
    return deduplicateProducts(matched).products;
  }, [allProducts, globalSearchQuery]);

  const globalRelatedIdsMap = useMemo(() => {
    if (!globalSearchQuery.trim()) return {};
    const lowerQuery = globalSearchQuery.toLowerCase();
    const matched = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.section_name &&
          p.section_name.toLowerCase().includes(lowerQuery)) ||
        (p.category_name &&
          p.category_name.toLowerCase().includes(lowerQuery))
    );
    return deduplicateProducts(matched).idMap;
  }, [allProducts, globalSearchQuery]);

  // ── Navigation ────────────────────────────────────
  const handleBack = () => {
    if (
      typeof selectedSupplierId === "number" ||
      selectedSupplierId === "unsorted"
    ) {
      setSelectedSupplierId("suppliers");
    } else {
      router.push("/");
    }
  };

  const pageTitle =
    typeof selectedSupplierId === "number"
      ? suppliers.find((s) => s.id === selectedSupplierId)?.name ||
        "Поставщик"
      : selectedSupplierId === "unsorted"
        ? "Нераспределенные"
        : "Поставщики";

  return {
    status,
    isAuthorized,
    selectedSupplierId,
    setSelectedSupplierId,
    globalSearchQuery,
    setGlobalSearchQuery,
    suppliers,
    unassignedProducts,
    supplierProducts,
    relatedIdsMap,
    loading,
    unassignedCount,
    syncing,
    handleSync,
    searchedProducts,
    globalRelatedIdsMap,
    handleBack,
    pageTitle,
    loadData,
    router,
  };
}

// ── Utility ────────────────────────────────────────────────
function deduplicateProducts(products: Product[]): {
  products: Product[];
  idMap: Record<number, number[]>;
} {
  const groupedMap = new Map<string, Product>();
  const idMap: Record<number, number[]> = {};

  products.forEach((p: Product) => {
    const key = p.poster_ingredient_id || `local_${p.id}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { ...p });
      idMap[p.id] = [p.id];
    } else {
      const existing = groupedMap.get(key)!;
      existing.quantity =
        (Number(existing.quantity) || 0) + (Number(p.quantity) || 0);
      if (
        p.section_name &&
        !existing.section_name?.includes(p.section_name)
      ) {
        existing.section_name = existing.section_name
          ? `${existing.section_name}, ${p.section_name}`
          : p.section_name;
      }
      if (idMap[existing.id]) {
        idMap[existing.id].push(p.id);
      }
    }
  });

  return { products: Array.from(groupedMap.values()), idMap };
}
