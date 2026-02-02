import { useState, useCallback } from "react";

/**
 * Generic hook for managing form modals with create/edit states
 * Reduces boilerplate across manager tabs
 * 
 * @example
 * const { isOpen, isEditing, formData, open, openEdit, close, setFormData } = useFormModal<ProductFormData>({
 *   name: "",
 *   unit: "",
 *   section_id: null,
 * });
 */
export function useFormModal<T extends Record<string, any>>(defaultValues: T) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<T>(defaultValues);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Whether we're editing an existing item (vs creating new)
  const isEditing = editingId !== null;

  // Open modal for creating new item
  const open = useCallback(() => {
    setFormData(defaultValues);
    setEditingId(null);
    setIsOpen(true);
  }, [defaultValues]);

  // Open modal for editing existing item
  const openEdit = useCallback((id: number, data: Partial<T>) => {
    setFormData({ ...defaultValues, ...data });
    setEditingId(id);
    setIsOpen(true);
  }, [defaultValues]);

  // Close modal and reset state
  const close = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
    // Keep form data briefly for exit animation, then reset
    setTimeout(() => setFormData(defaultValues), 200);
  }, [defaultValues]);

  // Update a single field
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle input change event
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked } as T));
      return;
    }
    
    // Handle number
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: value === "" ? null : Number(value) } as T));
      return;
    }
    
    // Handle string
    setFormData((prev) => ({ ...prev, [name]: value } as T));
  }, []);

  return {
    isOpen,
    isEditing,
    editingId,
    formData,
    open,
    openEdit,
    close,
    setFormData,
    setField,
    handleChange,
  };
}

/**
 * Hook for managing simple boolean modals (confirmations, etc.)
 */
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  const open = useCallback((modalData?: any) => {
    setData(modalData ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setData(null), 200);
  }, []);

  return { isOpen, data, open, close };
}
