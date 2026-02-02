
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { api } from "@/lib/api-client";
import type { Product, Section, ProductCategory } from "@/types";

interface ProductFormData {
  id?: number;
  name: string;
  unit: string;
  section_id: number | null;
  category_id: number | null;
  is_active: boolean;
}

interface ProductsTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sections: Section[];
  categories: ProductCategory[];
  loading: boolean;
  onReload: () => void;
}

export function ProductsTab({
  products,
  setProducts,
  sections,
  categories,
  loading,
  onReload,
}: ProductsTabProps) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState<number | "all">("all");
  const [filterCategory, setFilterCategory] = useState<number | "all" | "uncategorized">("all");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<number | "none" | "">("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category_name && product.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Section filter
      const matchesSection = filterSection === "all" || product.section_id === filterSection;
      
      // Category filter (now supports "uncategorized")
      const matchesCategory = filterCategory === "all" || 
        (filterCategory === "uncategorized" ? !product.category_id : product.category_id === filterCategory);
      
      return matchesSearch && matchesSection && matchesCategory;
    });
  }, [products, searchQuery, filterSection, filterCategory]);

  // Pagination
  const pagination = usePagination(filteredProducts, { initialPageSize: 20 });

  // Selection helpers
  const isAllPageSelected = pagination.paginatedItems.length > 0 && 
    pagination.paginatedItems.every((p: any) => selectedIds.has(p.id));
  
  const isAllFilteredSelected = filteredProducts.length > 0 && 
    filteredProducts.every((p: any) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pagination.paginatedItems.forEach((p: any) => next.add(p.id));
      return next;
    });
  }, [pagination.paginatedItems]);

  const deselectAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pagination.paginatedItems.forEach((p: any) => next.delete(p.id));
      return next;
    });
  }, [pagination.paginatedItems]);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map((p: any) => p.id)));
  }, [filteredProducts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk update handler
  const handleBulkCategoryUpdate = async () => {
    if (selectedIds.size === 0 || bulkCategoryId === "") return;
    
    setIsBulkUpdating(true);
    try {
      const categoryValue = bulkCategoryId === "none" ? null : bulkCategoryId;
      const response = await api.patch("/api/section-products/batch", {
        product_ids: Array.from(selectedIds),
        category_id: categoryValue,
      });

      if (response.success) {
        const data = response.data as { updatedCount?: number } | undefined;
        toast.success(`Обновлено ${data?.updatedCount || selectedIds.size} товаров`);
        clearSelection();
        setBulkCategoryId("");
        onReload();
      } else {
        toast.error(response.error || "Ошибка при обновлении");
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Ошибка при обновлении товаров");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct({
      name: "",
      unit: "",
      section_id: null,
      category_id: null,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (product: any) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      unit: product.unit || "",
      section_id: product.section_id,
      category_id: product.category_id,
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      const response = editingProduct.id
        ? await api.patch("/api/section-products", editingProduct)
        : await api.post("/api/section-products", editingProduct);

      if (response.success) {
        setShowModal(false);
        setEditingProduct(null);
        onReload();
        toast.success(editingProduct.id ? "Товар обновлен" : "Товар создан");
      } else {
        toast.error(response.error || "Ошибка при сохранении товара");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Ошибка при сохранении товара");
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      const response = await api.delete(`/api/section-products?id=${productId}`);

      if (response.success) {
        setProducts(products.filter((p: any) => p.id !== productId));
        toast.success("Товар удален");
      } else {
        toast.error("Ошибка при удалении товара");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Ошибка при удалении товара");
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6 px-1 md:px-0">
          <div className="h-6 md:h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 md:h-10 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        {/* Mobile skeleton */}
        <div className="space-y-2 md:hidden">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <SkeletonTable rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6 px-1 md:px-0">
        <h2 className="text-base md:text-xl font-semibold">Товары ({filteredProducts.length}/{products.length})</h2>
        <Button onClick={handleCreate} size="sm" className="md:text-base md:px-4 md:py-2.5">
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по названию или категории..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterSection === "all" ? "all" : filterSection}
            onChange={(e) => setFilterSection(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Все секции</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.emoji} {section.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategory === "all" ? "all" : filterCategory === "uncategorized" ? "uncategorized" : filterCategory}
            onChange={(e) => setFilterCategory(e.target.value === "all" ? "all" : e.target.value === "uncategorized" ? "uncategorized" : Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Все категории</option>
            <option value="uncategorized">⚠️ Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {(searchQuery || filterSection !== "all" || filterCategory !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterSection("all");
                setFilterCategory("all");
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Выбрано: {selectedIds.size}
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Снять
              </button>
            </div>
            
            <div className="flex gap-2 text-xs">
              {!isAllPageSelected && (
                <button
                  onClick={selectAllOnPage}
                  className="text-blue-600 hover:text-blue-800"
                >
                  + страница ({pagination.paginatedItems.length})
                </button>
              )}
              {!isAllFilteredSelected && filteredProducts.length > pagination.paginatedItems.length && (
                <button
                  onClick={selectAllFiltered}
                  className="text-blue-600 hover:text-blue-800"
                >
                  + все ({filteredProducts.length})
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value === "none" ? "none" : e.target.value === "" ? "" : Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите категорию</option>
                <option value="none">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleBulkCategoryUpdate}
                disabled={bulkCategoryId === "" || isBulkUpdating}
                className="px-4"
              >
                {isBulkUpdating ? "..." : "OK"}
              </Button>
            </div>
          </div>

          {/* Desktop: horizontal layout */}
          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                Выбрано: {selectedIds.size}
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Снять выделение
              </button>
            </div>
            
            <div className="h-4 w-px bg-blue-300" />
            
            <div className="flex items-center gap-2">
              {!isAllPageSelected && (
                <button
                  onClick={selectAllOnPage}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Выбрать на странице ({pagination.paginatedItems.length})
                </button>
              )}
              {!isAllFilteredSelected && filteredProducts.length > pagination.paginatedItems.length && (
                <button
                  onClick={selectAllFiltered}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Выбрать все ({filteredProducts.length})
                </button>
              )}
            </div>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <select
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value === "none" ? "none" : e.target.value === "" ? "" : Number(e.target.value))}
                className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите категорию</option>
                <option value="none">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleBulkCategoryUpdate}
                disabled={bulkCategoryId === "" || isBulkUpdating}
              >
                {isBulkUpdating ? "..." : "Применить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет товаров</p>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Ничего не найдено</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterSection("all");
              setFilterCategory("all");
            }}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-2 md:hidden">
            {pagination.paginatedItems.map((product: any) => (
              <div
                key={product.id}
                className={`border rounded-lg p-3 transition-all ${
                  selectedIds.has(product.id)
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : product.poster_ingredient_id
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Header with checkbox */}
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(product.id);
                    }}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleEdit(product)}
                  >
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.is_active ? "✓" : "○"}
                      </span>
                      {product.poster_ingredient_id && (
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-medium">
                          📦
                        </span>
                      )}
                      <span className={`text-xs ${product.category_name ? "text-gray-600" : "text-orange-500 font-medium"}`}>
                        {product.category_name || "Без категории"} • {product.unit || "—"}
                      </span>
                    </div>
                  </div>
                  {!product.poster_ingredient_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`Удалить товар "${product.name}"?`)) return;
                        handleDelete(product.id);
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Section Info */}
                <div className="text-xs text-gray-500">
                  📍 {product.section_name || "Без секции"}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={() => isAllPageSelected ? deselectAllOnPage() : selectAllOnPage()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Название</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Категория</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Единица</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Секция</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((product: any) => (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-200 transition-colors ${
                      selectedIds.has(product.id)
                        ? "bg-blue-100"
                        : product.poster_ingredient_id 
                        ? "bg-blue-50 hover:bg-blue-100" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => handleEdit(product)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{product.name}</span>
                        {product.poster_ingredient_id && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                            📦 Poster
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${product.category_name ? "text-gray-700" : "text-orange-500 font-medium"}`}>
                      {product.category_name || "Без категории"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{product.unit || "—"}</td>
                    <td className="py-3 px-4 text-gray-700">{product.section_name || "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.is_active ? "✓ Активен" : "○ Неактивен"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!product.poster_ingredient_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!confirm(`Удалить товар "${product.name}"?`)) return;
                              handleDelete(product.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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

          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onNextPage={pagination.nextPage}
            onPrevPage={pagination.prevPage}
            onGoToPage={pagination.goToPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProduct(null);
        }}
        title={editingProduct?.id ? "Редактировать товар" : "Добавить товар"}
      >
        {editingProduct && (
          <div className="space-y-4">
            <Input
              label="Название *"
              value={editingProduct.name}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, name: e.target.value })
              }
              placeholder="Название товара"
            />

            <Input
              label="Единица измерения"
              value={editingProduct.unit}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, unit: e.target.value })
              }
              placeholder="кг, шт, л"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Секция *</label>
              <select
                value={editingProduct.section_id || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    section_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
              <select
                value={editingProduct.category_id || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    category_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
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
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, is_active: e.target.checked })
                }
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Активен
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editingProduct.name || !editingProduct.section_id}
                className="flex-1"
              >
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
