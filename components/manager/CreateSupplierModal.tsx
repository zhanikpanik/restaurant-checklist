import { useState } from "react";
import { BottomSheet, FormInput, FormButton } from "@/components/ui/BottomSheet";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

export function CreateSupplierModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Введите название поставщика");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post("/api/suppliers", form);

      if (data.success) {
        toast.success("Поставщик создан");
        setForm({ name: "", phone: "" });
        onSuccess();
      } else {
        toast.error(data.error || "Ошибка создания");
      }
    } catch (error) {
      toast.error("Ошибка создания поставщика");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Новый поставщик">
      <FormInput
        label="Название"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
        placeholder="Например: Фрукт-Алма"
        required
        autoFocus
      />
      <FormInput
        label="Телефон (WhatsApp)"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
        placeholder="+7 777 123 4567"
        type="tel"
      />
      <div className="mt-6">
        <FormButton onClick={handleSubmit} loading={submitting}>
          Создать
        </FormButton>
      </div>
    </BottomSheet>
  );
}