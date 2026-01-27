"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Select } from "@/components/ui";
import { Section, ProductCategory } from "@/types";

interface ProductFormData {
  id?: number;
  name: string;
  unit: string;
  section_id: number | null;
  category_id: number | null;
  is_active: boolean;
}

interface ProductModalProps {
  product: ProductFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  sections: Section[];
  categories: ProductCategory[];
}

const UNIT_OPTIONS = [
  { value: "шт", label: "шт (штука)" },
  { value: "кг", label: "кг (килограмм)" },
  { value: "г", label: "г (грамм)" },
  { value: "л", label: "л (литр)" },
  { value: "мл", label: "мл (миллилитр)" },
  { value: "упак", label: "упак (упаковка)" },
  { value: "бутылка", label: "бутылка" },
  { value: "коробка", label: "коробка" },
  { value: "мешок", label: "мешок" },
];

export function ProductModal({
  product,
  isOpen,
  onClose,
  onSave,
  onDelete,
  sections,
  categories,
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    unit: "шт",
    section_id: null,
    category_id: null,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: "",
        unit: "шт",
        section_id: null,
        category_id: null,
        is_active: true,
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id || !onDelete) return;
    if (!confirm("Удалить этот товар?")) return;

    setIsDeleting(true);
    try {
      await onDelete(product.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = !!product?.id;

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: `${s.emoji} ${s.name}`,
  }));

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Редактировать товар" : "Добавить товар"}
      footer={
        <>
          {isEditing && onDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="mr-auto"
            >
              Удалить
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            {isEditing ? "Сохранить" : "Добавить"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Название товара"
          required
        />

        <Select
          label="Единица измерения"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          options={UNIT_OPTIONS}
        />

        <Select
          label="Отдел"
          value={formData.section_id?.toString() || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              section_id: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          options={sectionOptions}
          placeholder="Выберите отдел"
        />

        <Select
          label="Категория"
          value={formData.category_id?.toString() || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              category_id: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          options={categoryOptions}
          placeholder="Выберите категорию"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Активный товар
          </label>
        </div>
      </div>
    </Modal>
  );
}
