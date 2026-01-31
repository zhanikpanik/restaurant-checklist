"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import type { Supplier } from "@/types";

interface SupplierFormData {
  id?: number;
  name: string;
  phone: string;
  contact_info: string;
}

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  loading: boolean;
  onReload: () => void;
}

export function SuppliersTab({
  suppliers,
  setSuppliers,
  loading,
  onReload,
}: SuppliersTabProps) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierFormData | null>(null);

  const handleCreate = () => {
    setEditingSupplier({ name: "", phone: "", contact_info: "" });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone || "",
      contact_info: supplier.contact_info || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingSupplier) return;

    try {
      const method = editingSupplier.id ? "PATCH" : "POST";
      const response = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSupplier),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        setEditingSupplier(null);
        onReload();
        toast.success(editingSupplier.id ? "Поставщик обновлен" : "Поставщик создан");
      } else {
        toast.error(data.error || "Ошибка при сохранении поставщика");
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Ошибка при сохранении поставщика");
    }
  };

  const handleDelete = async (supplierId: number) => {
    if (!confirm("Удалить этого поставщика?")) return;

    try {
      const response = await fetch(`/api/suppliers?id=${supplierId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setSuppliers(suppliers.filter((s) => s.id !== supplierId));
        toast.success("Поставщик удален");
      } else {
        toast.error(data.error || "Ошибка при удалении поставщика");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Ошибка при удалении поставщика");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-44 bg-gray-200 rounded animate-pulse" />
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
        <h2 className="text-lg font-semibold">Поставщики ({suppliers.length})</h2>
        <Button onClick={handleCreate}>+ Добавить поставщика</Button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyStateIllustrated
          type="suppliers"
          title="Нет поставщиков"
          description="Добавьте первого поставщика"
          action={{
            label: "+ Добавить поставщика",
            onClick: handleCreate,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => handleEdit(supplier)}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                  {supplier.phone && (
                    <p className="text-sm text-gray-500 mt-1">📞 {supplier.phone}</p>
                  )}
                  {supplier.contact_info && (
                    <p className="text-sm text-gray-500 mt-1">{supplier.contact_info}</p>
                  )}
                  {(supplier as any).poster_supplier_id && (
                    <p className="text-xs text-gray-400 italic mt-1">
                      Из Poster (ID: {(supplier as any).poster_supplier_id})
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier?.id ? "Редактировать поставщика" : "Создать поставщика"}
      >
        {editingSupplier && (
          <div className="space-y-4">
            <Input
              label="Название"
              value={editingSupplier.name}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, name: e.target.value })
              }
              placeholder="Название"
            />

            <Input
              label="Телефон"
              value={editingSupplier.phone}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, phone: e.target.value })
              }
              placeholder="+7 XXX XXX XX XX"
            />

            <Textarea
              label="Контактная информация"
              value={editingSupplier.contact_info}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, contact_info: e.target.value })
              }
              placeholder="Email, адрес, примечания..."
              rows={3}
            />

            <div className="space-y-3 mt-6">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Сохранить
                </Button>
              </div>
              {editingSupplier.id && !(editingSupplier as any).poster_supplier_id && (
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingSupplier.id!);
                    setShowModal(false);
                    setEditingSupplier(null);
                  }}
                  className="w-full"
                >
                  Удалить поставщика
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
