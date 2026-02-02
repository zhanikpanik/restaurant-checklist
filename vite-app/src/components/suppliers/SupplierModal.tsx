
import { useState, useEffect } from "react";
import { Modal, Button, Input, Textarea } from "@/components/ui";

interface SupplierFormData {
  id?: number;
  name: string;
  phone: string;
  contact_info: string;
}

interface SupplierModalProps {
  supplier: SupplierFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupplierFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export function SupplierModal({
  supplier,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    phone: "",
    contact_info: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({ name: "", phone: "", contact_info: "" });
    }
  }, [supplier]);

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
    if (!supplier?.id || !onDelete) return;
    if (!confirm("Удалить этого поставщика?")) return;

    setIsDeleting(true);
    try {
      await onDelete(supplier.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = !!supplier?.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Редактировать поставщика" : "Добавить поставщика"}
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
          placeholder="Название поставщика"
          required
        />
        <Input
          label="Телефон"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+7 (999) 123-45-67"
          type="tel"
        />
        <Textarea
          label="Дополнительная информация"
          value={formData.contact_info}
          onChange={(e) =>
            setFormData({ ...formData, contact_info: e.target.value })
          }
          placeholder="Адрес, email, комментарии..."
          rows={3}
        />
      </div>
    </Modal>
  );
}
