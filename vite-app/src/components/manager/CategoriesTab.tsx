
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { api } from "@/lib/api-client";
import type { ProductCategory, Supplier } from "@/types";

interface CategoryFormData {
  id?: number;
  name: string;
  supplier_id: number | null;
}

interface CategoriesTabProps {
  categories: ProductCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  suppliers: Supplier[];
  loading: boolean;
  onReload: () => void;
}

export function CategoriesTab({
  categories,
  setCategories,
  suppliers,
  loading,
  onReload,
}: CategoriesTabProps) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryFormData | null>(null);

  const handleCreate = () => {
    setEditingCategory({ name: "", supplier_id: null });
    setShowModal(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      supplier_id: category.supplier_id ?? null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingCategory) return;

    try {
      const response = editingCategory.id 
        ? await api.patch("/api/categories", editingCategory)
        : await api.post("/api/categories", editingCategory);

      if (response.success) {
        setShowModal(false);
        setEditingCategory(null);
        onReload();
        toast.success(editingCategory.id ? "Категория обновлена" : "Категория создана");
      } else {
        toast.error(response.error || "Ошибка при сохранении категории");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Ошибка при сохранении категории");
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm("Удалить эту категорию?")) return;

    try {
      const response = await api.delete(`/api/categories?id=${categoryId}`);

      if (response.success) {
        setCategories(categories.filter((c) => c.id !== categoryId));
        toast.success("Категория удалена");
      } else {
        toast.error(response.error || "Ошибка при удалении категории");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Ошибка при удалении категории");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Категории товаров ({categories.length})</h2>
        <Button onClick={handleCreate}>+ Добавить категорию</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyStateIllustrated
          type="categories"
          title="Нет категорий"
          description="Создайте первую категорию товаров"
          action={{
            label: "+ Добавить категорию",
            onClick: handleCreate,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleEdit(category)}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  {(category as any).supplier_name ? (
                    <p className="text-sm text-gray-600 mt-1">
                      📦 Поставщик: {(category as any).supplier_name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">Поставщик не назначен</p>
                  )}
                  {(category as any).poster_category_id && (
                    <p className="text-xs text-gray-400 italic mt-1">
                      Из Poster (ID: {(category as any).poster_category_id})
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
        }}
        title={editingCategory?.id ? "Редактировать категорию" : "Создать категорию"}
      >
        {editingCategory && (
          <div className="space-y-4">
            <Input
              label="Название категории"
              value={editingCategory.name}
              onChange={(e) =>
                setEditingCategory({ ...editingCategory, name: e.target.value })
              }
              placeholder="Название"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Поставщик</label>
              <select
                value={editingCategory.supplier_id || ""}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    supplier_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
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

            <div className="space-y-3 mt-6">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Сохранить
                </Button>
              </div>
              {editingCategory.id && !(editingCategory as any).poster_category_id && (
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingCategory.id!);
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  className="w-full"
                >
                  Удалить категорию
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
