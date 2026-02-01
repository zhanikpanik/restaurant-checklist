"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { api } from "@/lib/api-client";
import type { Section } from "@/types";

interface SectionFormData {
  id?: number;
  name: string;
  emoji: string;
  poster_storage_id: number | null;
}

interface DepartmentsTabProps {
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  loading: boolean;
  onReload: () => void;
}

export function DepartmentsTab({
  sections,
  setSections,
  loading,
  onReload,
}: DepartmentsTabProps) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionFormData | null>(null);

  const handleCreate = () => {
    setEditingSection({ name: "", emoji: "📦", poster_storage_id: null });
    setShowModal(true);
  };

  const handleEdit = (section: Section) => {
    setEditingSection({
      id: section.id,
      name: section.name,
      emoji: section.emoji || "📦",
      poster_storage_id: section.poster_storage_id ?? null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingSection) return;

    try {
      const response = editingSection.id
        ? await api.patch("/api/sections", editingSection)
        : await api.post("/api/sections", editingSection);

      if (response.success) {
        setShowModal(false);
        setEditingSection(null);
        onReload();
        toast.success(editingSection.id ? "Секция обновлена" : "Секция создана");
      } else {
        toast.error(response.error || "Ошибка при сохранении секции");
      }
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Ошибка при сохранении секции");
    }
  };

  const handleDelete = async (sectionId: number) => {
    if (!confirm("Удалить эту секцию?")) return;

    try {
      const response = await api.delete(`/api/sections?id=${sectionId}`);

      if (response.success) {
        setSections(sections.filter((s) => s.id !== sectionId));
        toast.success("Секция удалена");
      } else {
        toast.error(response.error || "Ошибка при удалении секции");
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Ошибка при удалении секции");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-52 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
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
        <h2 className="text-lg font-semibold">Секции ({sections.length})</h2>
        <Button onClick={handleCreate}>+ Добавить секцию</Button>
      </div>

      {sections.length === 0 ? (
        <EmptyStateIllustrated
          type="departments"
          title="Нет секций"
          description="Создайте первую секцию или синхронизируйте из Poster"
          action={{
            label: "+ Добавить секцию",
            onClick: handleCreate,
          }}
        />
      ) : (
        <div className="grid gap-4">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => handleEdit(section)}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-lg">
                    {section.emoji} {section.name}
                  </h3>
                  {section.poster_storage_id && (
                    <p className="text-sm text-gray-500 mt-1">
                      Poster Storage ID: {section.poster_storage_id}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Товаров: {(section as any).custom_products_count || 0}
                  </p>
                </div>
                {section.poster_storage_id && (
                  <span className="text-xs text-gray-400 italic">Из Poster</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSection(null);
        }}
        title={editingSection?.id ? "Редактировать секцию" : "Добавить секцию"}
      >
        {editingSection && (
          <div className="space-y-4">
            <Input
              label="Название *"
              value={editingSection.name}
              onChange={(e) =>
                setEditingSection({ ...editingSection, name: e.target.value })
              }
              placeholder="Название секции"
            />

            <Input
              label="Эмодзи"
              value={editingSection.emoji}
              onChange={(e) =>
                setEditingSection({ ...editingSection, emoji: e.target.value })
              }
              placeholder="📦"
              maxLength={2}
            />

            <Input
              label="Poster Storage ID"
              type="number"
              value={editingSection.poster_storage_id?.toString() || ""}
              onChange={(e) =>
                setEditingSection({
                  ...editingSection,
                  poster_storage_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="ID склада в Poster"
            />

            <div className="space-y-3 mt-6">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSection(null);
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!editingSection.name}
                  className="flex-1"
                >
                  Сохранить
                </Button>
              </div>
              {editingSection.id && !editingSection.poster_storage_id && (
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingSection.id!);
                    setShowModal(false);
                    setEditingSection(null);
                  }}
                  className="w-full"
                >
                  Удалить секцию
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
