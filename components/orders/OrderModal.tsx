"use client";

import { useState } from "react";
import { Order, OrderItem } from "@/types";
import { Modal, Button, OrderStatusBadge } from "@/components/ui";
import { QuantityInput } from "@/components/ui/QuantityInput";

interface OrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: OrderItem[]) => Promise<void>;
  onAddProduct?: () => void;
}

export function OrderModal({
  order,
  isOpen,
  onClose,
  onSave,
  onAddProduct,
}: OrderModalProps) {
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync items when order changes
  useState(() => {
    if (order) {
      setEditingItems(order.order_data.items || []);
      setHasChanges(false);
    }
  });

  if (!order) return null;

  const handleRemoveItem = (index: number) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setEditingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editingItems);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const groupItemsBySupplier = () => {
    const grouped = new Map<string, OrderItem[]>();
    editingItems.forEach((item) => {
      const supplierName = item.supplier || "Без поставщика";
      if (!grouped.has(supplierName)) {
        grouped.set(supplierName, []);
      }
      grouped.get(supplierName)!.push(item);
    });
    return grouped;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Заказ #${order.id}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          {hasChanges && (
            <Button onClick={handleSave} isLoading={isSaving}>
              Сохранить изменения
            </Button>
          )}
        </>
      }
    >
      {/* Order Meta */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b">
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-gray-500">
          Создан: {formatDate(order.created_at)}
        </span>
        {order.order_data.department && (
          <span className="text-sm text-gray-700 font-medium">
            {order.order_data.department}
          </span>
        )}
      </div>

      {/* Items grouped by supplier */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Array.from(groupItemsBySupplier()).map(([supplier, items]) => (
          <div key={supplier} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700 flex items-center gap-2">
              <span>📦</span>
              <span>{supplier}</span>
              <span className="text-xs text-gray-500">
                ({items.length} позиций)
              </span>
            </div>
            <div className="divide-y">
              {items.map((item, idx) => {
                const globalIndex = editingItems.indexOf(item);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.category && (
                        <p className="text-xs text-gray-500">{item.category}</p>
                      )}
                    </div>
                    <QuantityInput
                      productName={item.name}
                      quantity={item.quantity}
                      unit={item.unit || "шт"}
                      onQuantityChange={(newQty) => handleUpdateQuantity(globalIndex, newQty)}
                      onRemove={() => handleRemoveItem(globalIndex)}
                      showRemoveButton={true}
                      compact={true}
                      min={1}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {editingItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Заказ пуст</p>
          </div>
        )}
      </div>

      {/* Add product button */}
      {onAddProduct && (
        <div className="mt-4 pt-4 border-t">
          <Button variant="secondary" onClick={onAddProduct} className="w-full">
            ➕ Добавить товар
          </Button>
        </div>
      )}
    </Modal>
  );
}
