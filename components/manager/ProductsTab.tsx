"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
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
      const method = editingProduct.id ? "PATCH" : "POST";
      const response = await fetch("/api/section-products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        setEditingProduct(null);
        onReload();
        toast.success(editingProduct.id ? "Товар обновлен" : "Товар создан");
      } else {
        toast.error(data.error || "Ошибка при сохранении товара");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Ошибка при сохранении товара");
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      const response = await fetch(`/api/section-products?id=${productId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
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
        <h2 className="text-base md:text-xl font-semibold">Товары ({products.length})</h2>
        <Button onClick={handleCreate} size="sm" className="md:text-base md:px-4 md:py-2.5">
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет товаров</p>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-2 md:hidden">
            {products.map((product: any) => (
              <div
                key={product.id}
                onClick={() => handleEdit(product)}
                className={`border rounded-lg p-3 transition-all cursor-pointer ${
                  product.poster_ingredient_id
                    ? "bg-blue-50 border-blue-200 hover:border-blue-300"
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
                      <span className="text-xs text-gray-600">
                        {product.category_name || "—"} • {product.unit || "—"}
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
                    onClick={() => handleEdit(product)}
                    className={`border-b border-gray-200 transition-colors cursor-pointer ${
                      product.poster_ingredient_id ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
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
