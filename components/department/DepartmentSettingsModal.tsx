"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

interface Section {
  id: number;
  name: string;
  emoji: string;
}

interface DepartmentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section;
  onUpdate: () => void;
}

const EMOJI_OPTIONS = ["🍳", "🍺", "🧹", "📦", "🏪", "🍕", "☕", "🥗", "🧊", "🛒"];

export function DepartmentSettingsModal({
  isOpen,
  onClose,
  section,
  onUpdate,
}: DepartmentSettingsModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(section.name);
  const [emoji, setEmoji] = useState(section.emoji || "🏪");

  useEffect(() => {
    if (isOpen) {
      setName(section.name);
      setEmoji(section.emoji || "🏪");
    }
  }, [isOpen, section]);

  const handleSaveSettings = async () => {
    if (!name.trim()) {
      toast.error("Введите название отдела");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.patch("/api/sections", {
        id: section.id,
        name: name.trim(),
        emoji,
      });

      if (response.success) {
        toast.success("Настройки обновлены");
        onUpdate();
        onClose();
      } else {
        toast.error(response.error || "Ошибка обновления");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Ошибка обновления настроек");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Department"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kitchen"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon
          </label>
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_OPTIONS.map((emojiOption) => (
              <button
                key={emojiOption}
                type="button"
                onClick={() => setEmoji(emojiOption)}
                className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                  emoji === emojiOption
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {emojiOption}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} className="flex-1" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
