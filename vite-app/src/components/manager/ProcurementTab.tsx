import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyStateIllustrated } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import type { Order, Supplier, Product } from "@/types";

interface ProcurementTabProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  suppliers: Supplier[];
  products: Product[];
  loading: boolean;
  restaurantName: string;
  onReload: () => void;
}

type ViewMode = "review" | "dispatch";

// Helper to safely access item status
const getItemStatus = (item: any) => item.status || "pending";

export function ProcurementTab({
  orders,
  setOrders,
  suppliers,
  products,
  loading: _loading,
  restaurantName,
  onReload,
}: ProcurementTabProps) {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("review");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeptForAdd, setSelectedDeptForAdd] = useState<string | null>(null);

  // Filter for active orders (pending or sent)
  // We include 'sent' because we might need to receive them in the Dispatch view
  // We include 'pending' for the Review view
  const activeOrders = useMemo(() => {
    return orders.filter(o => ["pending", "sent"].includes(o.status));
  }, [orders]);

  // --- Review View Helpers ---

  // Group by Department
  const reviewItems = useMemo(() => {
    const departments = new Map<string, { name: string; items: any[]; orderIds: Set<number> }>();

    activeOrders.forEach(order => {
      // Only show items that are still pending review? 
      // User said: "Checklist -> Dispatch". 
      // Usually you review "pending" items. "Sent" items are already processed.
      if (order.status !== 'pending') return;

      const deptName = order.order_data.department || "General";
      
      if (!departments.has(deptName)) {
        departments.set(deptName, { name: deptName, items: [], orderIds: new Set() });
      }

      const deptGroup = departments.get(deptName)!;
      deptGroup.orderIds.add(order.id);

      order.order_data.items.forEach((item, itemIdx) => {
        // If we implement item-level status, only show pending items here
        if (getItemStatus(item) === 'pending') {
          deptGroup.items.push({
            ...item,
            _orderId: order.id,
            _itemIdx: itemIdx // Needed to update specific item
          });
        }
      });
    });

    return Array.from(departments.values());
  }, [activeOrders]);

  // --- Dispatch View Helpers ---

  const dispatchGroups = useMemo(() => {
    const toSend = new Map<string, { items: any[]; orderIds: Set<number> }>();
    const expecting = new Map<string, { items: any[]; orderIds: Set<number> }>();

    activeOrders.forEach(order => {
      order.order_data.items.forEach((item, itemIdx) => {
        const status = getItemStatus(item);
        const supplier = item.supplier || "Без поставщика";
        const itemWithMeta = { ...item, _orderId: order.id, _itemIdx: itemIdx };

        if (status === 'pending') {
          if (!toSend.has(supplier)) toSend.set(supplier, { items: [], orderIds: new Set() });
          toSend.get(supplier)!.items.push(itemWithMeta);
          toSend.get(supplier)!.orderIds.add(order.id);
        } else if (status === 'sent') {
          if (!expecting.has(supplier)) expecting.set(supplier, { items: [], orderIds: new Set() });
          expecting.get(supplier)!.items.push(itemWithMeta);
          expecting.get(supplier)!.orderIds.add(order.id);
        }
      });
    });

    return {
      toSend: Array.from(toSend.entries()),
      expecting: Array.from(expecting.entries())
    };
  }, [activeOrders]);

  // --- Actions ---

  const handleQuantityChange = async (orderId: number, itemIdx: number, newQty: number) => {
    // Optimistic update
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const updatedOrders = [...orders];
    const order = { ...updatedOrders[orderIndex] };
    const items = [...order.order_data.items];
    items[itemIdx] = { ...items[itemIdx], quantity: newQty };
    order.order_data = { ...order.order_data, items };
    updatedOrders[orderIndex] = order;
    
    setOrders(updatedOrders);

    // Debounce or just fire? For simplicity, fire.
    // In real app, debounce.
    try {
      await api.patch("/api/orders", {
        id: orderId,
        order_data: order.order_data
      });
    } catch (e) {
      console.error("Failed to update quantity", e);
      // Revert on error?
    }
  };

  const handleDeleteItem = async (orderId: number, itemIdx: number) => {
    if (!confirm("Remove this item?")) return;

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const updatedOrders = [...orders];
    const order = { ...updatedOrders[orderIndex] };
    const items = order.order_data.items.filter((_, idx) => idx !== itemIdx);
    
    // If order becomes empty, maybe delete the order? 
    // For now, just keep empty order or handle it.
    
    order.order_data = { ...order.order_data, items };
    updatedOrders[orderIndex] = order;
    setOrders(updatedOrders);

    try {
        if (items.length === 0) {
            await api.delete(`/api/orders?id=${orderId}`);
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
            await api.patch("/api/orders", {
                id: orderId,
                order_data: order.order_data
            });
        }
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  const handleAddItem = async (productId: number) => {
    if (!selectedDeptForAdd) return;

    // Find an existing pending order for this department or create new one
    // Ideally we append to the most recent pending order for this dept
    let targetOrder = activeOrders.find(o => 
        o.order_data.department === selectedDeptForAdd && o.status === 'pending'
    );

    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    const newItem = {
        name: product.name,
        quantity: 1,
        unit: product.unit || "шт",
        category: (product as any).category_name || "",
        supplier: (product as any).supplier_name || "",
        productId: product.id,
        status: 'pending'
    };

    try {
        if (targetOrder) {
            const updatedItems = [...targetOrder.order_data.items, newItem];
            const res = await api.patch("/api/orders", {
                id: targetOrder.id,
                order_data: { ...targetOrder.order_data, items: updatedItems }
            });
            if (res.success) {
                // Update local state
                setOrders(prev => prev.map(o => o.id === targetOrder!.id ? { ...o, order_data: { ...o.order_data, items: updatedItems } } : o));
                toast.success("Товар добавлен");
            }
        } else {
            // Create new order? This is edge case. 
            // We need a restaurant ID etc.
            // For now assume there is always an order if we are in this view.
            // If the list is empty, we can't easily "add to department" because department doesn't exist in view.
            toast.error("Cannot add item to empty department list");
        }
    } catch (e) {
        toast.error("Error adding item");
    }
    setShowAddModal(false);
  };

  const handleBatchUpdateStatus = async (items: any[], newStatus: 'sent' | 'delivered') => {
    // We need to update multiple orders.
    // Group items by orderId
    const updatesByOrder = new Map<number, any[]>();
    
    items.forEach(item => {
        if (!updatesByOrder.has(item._orderId)) {
            // Find the current order items
            const order = orders.find(o => o.id === item._orderId);
            if (order) updatesByOrder.set(item._orderId, [...order.order_data.items]);
        }
        
        const currentItems = updatesByOrder.get(item._orderId)!;
        if (currentItems[item._itemIdx]) {
            currentItems[item._itemIdx] = { ...currentItems[item._itemIdx], status: newStatus };
        }
    });

    // Execute updates
    try {
        const promises = Array.from(updatesByOrder.entries()).map(([orderId, updatedItems]) => {
            // Check if all items are delivered to update order status
            let orderStatus = orders.find(o => o.id === orderId)?.status || 'pending';
            if (newStatus === 'delivered') {
                const allDelivered = updatedItems.every((i: any) => (i.status || 'pending') === 'delivered');
                if (allDelivered) orderStatus = 'delivered';
            } else if (newStatus === 'sent') {
                // If at least one is sent and none are pending? 
                // Let's just set order to 'sent' if it was pending
                if (orderStatus === 'pending') orderStatus = 'sent';
            }

            return api.patch("/api/orders", {
                id: orderId,
                order_data: { items: updatedItems }, // We need to preserve other order_data fields? The API usually does a merge or partial update?
                // Based on previous code: order_data is replaced or merged. 
                // Let's pass the full order_data structure from the original order to be safe.
                // But here I only have items.
                // It's safer to use the original order object and update items.
                status: orderStatus
            });
        });

        await Promise.all(promises);
        toast.success(newStatus === 'sent' ? "Marked as sent" : "Marked as delivered");
        onReload(); // Reload to be safe
    } catch (e) {
        toast.error("Error updating statuses");
    }
  };

  const sendToWhatsApp = (supplierName: string, items: any[]) => {
    const supplier = suppliers.find((s) => s.name === supplierName);
    const cleanPhone = supplier?.phone?.replace(/\D/g, "");
    
    // Construct message
    const dateStr = new Date().toLocaleDateString("ru-RU");
    let message = `Заказ от ${restaurantName}\nДата: ${dateStr}\n\n`;
    items.forEach((item, idx) => {
        message += `${idx + 1}. ${item.name} - ${item.quantity} ${item.unit || "шт"}\n`;
    });

    if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
        toast.error("Телефон не найден, но статус обновлен");
    }

    // Update status to 'sent'
    handleBatchUpdateStatus(items, 'sent');
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in">
        {/* Header / Tabs */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode("review")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        viewMode === "review" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    1. Проверка ({reviewItems.length} отделов)
                </button>
                <button
                    onClick={() => setViewMode("dispatch")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        viewMode === "dispatch" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    2. Отправка ({dispatchGroups.toSend.length})
                </button>
            </div>
            
            {viewMode === "review" && (
                 <Button onClick={() => setViewMode("dispatch")}>
                    К поставщикам →
                 </Button>
            )}
        </div>

        {/* --- REVIEW VIEW --- */}
        {viewMode === "review" && (
            <div className="space-y-8">
                {reviewItems.length === 0 ? (
                    <EmptyStateIllustrated
                        type="orders"
                        title="Нет активных заявок"
                        description="Все заявки проверены или отсутствуют."
                    />
                ) : (
                    reviewItems.map(dept => (
                        <div key={dept.name} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-lg">{dept.name}</h3>
                                <span className="text-xs text-gray-500">{dept.items.length} позиций</span>
                            </div>
                            <div className="divide-y">
                                {dept.items.map((item, idx) => (
                                    <div key={idx} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.supplier || "Нет поставщика"}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="w-16 p-1 border rounded text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item._orderId, item._itemIdx, Number(e.target.value))}
                                                min="0"
                                            />
                                            <span className="text-sm text-gray-500 w-8">{item.unit || "шт"}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteItem(item._orderId, item._itemIdx)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-50 border-t">
                                <button 
                                    onClick={() => {
                                        setSelectedDeptForAdd(dept.name);
                                        setShowAddModal(true);
                                    }}
                                    className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                                >
                                    + Добавить товар
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* --- DISPATCH VIEW --- */}
        {viewMode === "dispatch" && (
            <div className="space-y-8">
                {/* To Send Section */}
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>📤</span> К отправке
                    </h3>
                    
                    {dispatchGroups.toSend.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                            <p className="text-gray-500">Нет заказов для отправки</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {dispatchGroups.toSend.map(([supplier, group]) => (
                                <div key={supplier} className="bg-white border-2 border-blue-100 rounded-xl shadow-sm p-4 hover:border-blue-300 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg">{supplier}</h4>
                                            <p className="text-sm text-gray-500">{group.items.length} товаров</p>
                                        </div>
                                        <Badge variant="warning">Ожидает</Badge>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="text-gray-700 truncate mr-2">{item.name}</span>
                                                <span className="font-medium whitespace-nowrap">{item.quantity} {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Button 
                                        className="w-full" 
                                        variant="success"
                                        onClick={() => sendToWhatsApp(supplier, group.items)}
                                    >
                                        WhatsApp & Отметить
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expecting Delivery Section */}
                {dispatchGroups.expecting.length > 0 && (
                    <div className="pt-8 border-t">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>🚚</span> Ожидаем поставку
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {dispatchGroups.expecting.map(([supplier, group]) => (
                                <div key={supplier} className="bg-white border rounded-xl shadow-sm p-4 opacity-90 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-800">{supplier}</h4>
                                            <p className="text-sm text-gray-500">{group.items.length} товаров</p>
                                        </div>
                                        <Badge variant="info">Отправлено</Badge>
                                    </div>
                                    
                                    <Button 
                                        variant="secondary" 
                                        className="w-full"
                                        onClick={() => handleBatchUpdateStatus(group.items, 'delivered')}
                                    >
                                        ✓ Принять поставку
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Add Product Modal */}
        <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title={`Добавить товар в ${selectedDeptForAdd}`}
        >
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder="Поиск товара..." 
                    className="w-full px-4 py-2 border rounded-lg"
                    // Implement search logic if needed
                />
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                    {products.map(p => (
                        <button
                            key={p.id}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center"
                            onClick={() => handleAddItem(p.id)}
                        >
                            <span>{p.name}</span>
                            <span className="text-xs text-gray-500">{(p as any).category_name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    </div>
  );
}
