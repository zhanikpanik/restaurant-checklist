
import { useState, useEffect } from "react";
import { Modal, Button, Input, Select } from "@/components/ui";
import { Supplier } from "@/types";

interface CategoryFormData {
  id?: number;
  name: string;
  supplier_id: number | null;
}

interface CategoryModalProps {
  category: CategoryFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  suppliers: Supplier[];
}

export function CategoryModal({
  category,
  isOpen,
  onClose,
  onSave,
  onDelete,
  suppliers,
}: CategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    supplier_id: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({ name: "", supplier_id: null });
    }
  }, [category]);

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
    if (!category?.id || !onDelete) return;
    if (!confirm("Удалить эту категорию?")) return;

    setIsDeleting(true);
    try {
      await onDelete(category.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = !!category?.id;

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Редактировать категорию" : "Добавить категорию"}
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
          label="Название категории"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Молочные продукты"
          required
        />

        <Select
          label="Поставщик по умолчанию"
          value={formData.supplier_id?.toString() || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              supplier_id: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          options={supplierOptions}
          placeholder="Выберите поставщика"
          hint="Поставщик будет автоматически назначаться товарам этой категории"
        />
      </div>
    </Modal>
  );
}
