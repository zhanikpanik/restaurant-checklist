
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { Order, Supplier, Product } from "@/types";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate: (updatedOrder: Order) => void;
  suppliers: Supplier[];
  products: Product[];
  restaurantName: string;
}

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onOrderUpdate,
  suppliers,
  products,
  restaurantName,
}: OrderDetailsModalProps) {
  const toast = useToast();
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Sync editing items when order changes
  if (order && editingItems.length === 0 && order.order_data.items?.length > 0) {
    setEditingItems(order.order_data.items);
  }

  const handleRemoveItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      const response = await api.patch("/api/orders", {
        id: order.id,
        order_data: {
          ...order.order_data,
          items: editingItems,
        },
      });

      if (response.success) {
        onOrderUpdate({
          ...order,
          order_data: { ...order.order_data, items: editingItems },
        });
        toast.success("Заказ обновлен");
      } else {
        toast.error("Ошибка при обновлении заказа: " + response.error);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Ошибка при обновлении заказа");
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;

    try {
      const response = await api.patch("/api/orders", { id: order.id, status: newStatus });

      if (response.success) {
        onOrderUpdate({ ...order, status: newStatus as Order["status"] });
        toast.success(`Статус изменен на "${getStatusLabel(newStatus)}"`);
      } else {
        toast.error(response.error || "Ошибка при изменении статуса");
      }
    } catch (error) {
      toast.error("Ошибка при изменении статуса");
    }
  };

  const groupItemsBySupplier = (items: any[]) => {
    const grouped = new Map<string, any[]>();

    items.forEach((item) => {
      const supplierName = item.supplier || "Без поставщика";
      if (!grouped.has(supplierName)) {
        grouped.set(supplierName, []);
      }
      grouped.get(supplierName)!.push(item);
    });

    return grouped;
  };

  const sendToWhatsApp = (supplierName: string, items: any[]) => {
    if (!order) return;
    
    const supplier = suppliers.find((s) => s.name === supplierName);

    if (!supplier?.phone) {
      toast.warning(`Номер телефона для поставщика "${supplierName}" не найден`);
      return;
    }

    const cleanPhone = supplier.phone.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.warning(`Неверный формат номера телефона для поставщика "${supplierName}"`);
      return;
    }

    const dateStr = new Date(order.created_at).toLocaleDateString("ru-RU");

    let message = `Заказ от ${restaurantName}\n`;
    message += `Дата: ${dateStr}\n\n`;
    message += `Товары:\n`;

    const itemsToShow = items.slice(0, 20);
    itemsToShow.forEach((item, index) => {
      message += `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || "шт"}\n`;
    });

    if (items.length > 20) {
      message += `\n...и еще ${items.length - 20} позиций`;
    }

    message += `\nВсего: ${items.length} позиций`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (whatsappUrl.length > 2000) {
      const fallbackUrl = `https://wa.me/${cleanPhone}`;
      window.open(fallbackUrl, "_blank");
      toast.info("Сообщение слишком длинное. WhatsApp открыт без текста.");
    } else {
      window.open(whatsappUrl, "_blank");
      toast.success("WhatsApp открыт");
    }
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Ожидает",
      sent: "Отправлен",
      delivered: "Доставлен",
      cancelled: "Отменен",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Ожидает", variant: "warning" as const },
      sent: { label: "Отправлен", variant: "info" as const },
      delivered: { label: "Доставлен", variant: "success" as const },
      cancelled: { label: "Отменен", variant: "danger" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAddProduct = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    setEditingItems([
      ...editingItems,
      {
        name: product.name,
        quantity: 1,
        unit: product.unit || "шт",
        category: (product as any).category_name || "",
        supplier: (product as any).supplier_name || "",
        productId: product.id,
      },
    ]);
    setShowAddProductModal(false);
    toast.success(`${product.name} добавлен`);
  };

  const handleClose = () => {
    setEditingItems([]);
    onClose();
  };

  if (!order) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Заказ #${order.id}`}
        size="lg"
      >
        <div>
          {/* Order Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Дата создания</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Статус</p>
              <div className="mt-1 flex items-center gap-2">
                {getStatusBadge(order.status)}
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="pending">Ожидает</option>
                  <option value="sent">Отправлен</option>
                  <option value="delivered">Доставлен</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
            </div>
            {order.order_data.department && (
              <div>
                <p className="text-sm text-gray-500">Отдел</p>
                <p className="font-medium">{order.order_data.department}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Всего товаров</p>
              <p className="font-medium">{editingItems.length}</p>
            </div>
          </div>

          {/* Items grouped by supplier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">Товары по поставщикам</h3>
              <Button size="sm" onClick={() => setShowAddProductModal(true)}>
                + Добавить товар
              </Button>
            </div>
            {Array.from(groupItemsBySupplier(editingItems)).map(([supplierName, items]) => (
              <div key={supplierName} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <span>📦</span>
                    {supplierName}
                  </h4>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => sendToWhatsApp(supplierName, items)}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                  </Button>
                </div>
                <div className="space-y-1">
                  {items.map((item, idx) => {
                    const globalIdx = editingItems.findIndex((i) => i === item);
                    return (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-t">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {item.quantity} {item.unit || "шт"}
                          </p>
                          <button
                            onClick={() => handleRemoveItem(globalIdx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-gray-600">
                    Всего позиций: <span className="font-semibold">{items.length}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSaveChanges} className="flex-1">
              Сохранить изменения
            </Button>
          </div>

          {order.order_data.notes && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">Примечания:</p>
              <p className="text-sm text-yellow-700">{order.order_data.notes}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Добавить товар"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Выберите товар</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              onChange={(e) => {
                if (e.target.value) {
                  handleAddProduct(Number(e.target.value));
                }
              }}
            >
              <option value="">-- Выберите товар --</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category_name || "Без категории"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowAddProductModal(false)} className="flex-1">
            Отмена
          </Button>
        </div>
      </Modal>
    </>
  );
}
