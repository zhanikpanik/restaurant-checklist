"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useRestaurant, useStore } from "@/store/useStore";
import { api } from "@/lib/api-client";
import { getUserRootUrl } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { clientCache, fetchWithCache } from "@/lib/client-cache";
import type { CartItem } from "@/types";

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const cart = useCart();
  const restaurant = useRestaurant();
  const currentSection = useStore((state) => state.currentSection);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [notes, setNotes] = useState("");
  const [submittedOrderId, setSubmittedOrderId] = useState<number | null>(null);
  const [backLink, setBackLink] = useState<string>("/"); // Dynamic back link
  const [bulkSupplierId, setBulkSupplierId] = useState<string>("");
  const [allSuppliers, setAllSuppliers] = useState<any[]>(() => clientCache.get("cart_suppliers") || []);

  // Load suppliers for bulk assignment
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await fetchWithCache("/api/suppliers");
        if (data?.success) {
          setAllSuppliers(data.data);
          clientCache.set("cart_suppliers", data.data);
        }
      } catch (err) {
        console.error("Error loading suppliers:", err);
      }
    };
    fetchSuppliers();
  }, []);

  const userRole = session?.user?.role || "staff";
  const isManager = userRole === "manager" || userRole === "admin";

  // Determine back link on mount and when currentSection changes
  useEffect(() => {
    const determineBackLink = async () => {
      const rootUrl = await getUserRootUrl(isManager, currentSection);
      setBackLink(rootUrl);
    };

    determineBackLink();
  }, [currentSection, isManager]);

  // Group items by supplier
  const itemsBySupplier = useMemo(() => {
    const grouped: Record<string, CartItem[]> = {};
    const noSupplier: CartItem[] = [];

    cart.items.forEach((item) => {
      if (item.supplier) {
        if (!grouped[item.supplier]) {
          grouped[item.supplier] = [];
        }
        grouped[item.supplier].push(item);
      } else {
        noSupplier.push(item);
      }
    });

    return { grouped, noSupplier };
  }, [cart.items]);

  const getPluralForm = (count: number, words: string[]) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5]];
  };

  const formatProductCount = (count: number) => {
    return `${count} ${getPluralForm(count, ["товар", "товара", "товаров"])}`;
  };

  const supplierNames = Object.keys(itemsBySupplier.grouped).sort();

  const handleQuantityChange = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      cart.remove(cartId);
    } else {
      cart.updateQuantity(cartId, newQuantity);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.items.length === 0) {
      return;
    }

    setSubmitState('submitting');
    try {
      // Format items to ensure all required fields are present
      const formattedItems = cart.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || "шт",
        category: item.category,
        supplier: item.supplier,
        supplier_id: item.supplier_id,
        poster_id: item.poster_id,
        productId: item.productId,
      }));

      const response = await api.post<{ id?: number }>("/api/orders", {
        department: currentSection?.name || "Общий",
        section_id: currentSection?.id,
        items: formattedItems,
        notes: notes,
        created_by: "user",
      });

      if (response.success) {
        cart.clear();
        setNotes("");
        router.push('/orders');
      } else {
        throw new Error(response.error || "Failed to submit order");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      setSubmitState('error');
    }
  };

  const handleNewOrder = () => {
    cart.clear();
    setNotes("");
    setSubmitState('idle');
    setSubmittedOrderId(null);
  };

  // Success state view
  if (submitState === 'success') {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader
          title="Готово"
          backHref={backLink}
        />

        <div className="max-w-md mx-auto p-4">
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#1a1008] mb-6">
              Заказ успешно отправлен
            </h2>
            
            <div className="space-y-3 max-w-sm mx-auto">
              <button
                onClick={() => router.push('/orders')}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-[14px] font-semibold text-sm transition-colors"
              >
                Посмотреть в заказах
              </button>
              <button
                onClick={handleNewOrder}
                className="w-full py-3.5 rounded-[14px] font-semibold text-sm text-gray-500 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Создать новый заказ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const translateUnit = (u: string) => {
    const unitMap: Record<string, string> = {
      'kg': 'кг',
      'l': 'л',
      'pcs': 'шт',
      'p': 'шт',
      'pt': 'шт',
      'unit': 'шт',
      'pack': 'уп',
      'bottle': 'бут',
      'can': 'банка',
      'portion': 'порц',
      'g': 'г',
      'ml': 'мл'
    };
    return unitMap[u.toLowerCase()] || u;
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHeader
        title="Заявка"
        backHref={backLink}
      />

      <div className="max-w-md mx-auto p-4 pb-24">
        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#f5f3f1' }}>
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#1a1008] mb-1.5">
              Заявка пуста
            </h2>
            <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto">
              Добавьте ингредиенты из справочника, чтобы сформировать список на закупку.
            </p>
            <Link
              href="/"
              className="inline-flex bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-[14px] shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98] text-sm"
            >
              Перейти к выбору товаров
            </Link>
          </div>
        ) : (
          <>
            {/* Items List - Grouped by Supplier */}
            <div>
              {supplierNames.map((supplierName, idx) => (
                <div key={supplierName} className={idx > 0 ? 'mt-10' : ''}>
                  {/* Supplier Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/icons/box.svg" alt="" className="w-4 h-4 opacity-40" />
                    <h3 className="text-sm font-semibold text-gray-500">{supplierName}</h3>
                    <span className="text-sm text-gray-400">
                      {formatProductCount(itemsBySupplier.grouped[supplierName].length)}
                    </span>
                  </div>

                  {/* Items for this supplier — flat rows */}
                  <div>
                    {itemsBySupplier.grouped[supplierName].map((item) => (
                      <CartItemRow
                        key={item.cartId}
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={() => cart.remove(item.cartId)}
                        translateUnit={translateUnit}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Items without supplier */}
              {itemsBySupplier.noSupplier.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">⚠️</span>
                    <h3 className="text-sm font-semibold text-amber-600">Без поставщика</h3>
                    <span className="text-sm text-amber-600">
                      {formatProductCount(itemsBySupplier.noSupplier.length)}
                    </span>
                  </div>
                  
                  <div>
                    {itemsBySupplier.noSupplier.map((item) => (
                      <CartItemRow
                        key={item.cartId}
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={() => cart.remove(item.cartId)}
                        translateUnit={translateUnit}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Supplier Selection */}
            {itemsBySupplier.noSupplier.length > 0 && allSuppliers.length > 0 && (
              <div className="mt-4 mx-4 p-4 bg-amber-50 rounded-[14px] border border-amber-100">
                <p className="text-sm font-medium text-amber-600 mb-2">
                  Назначить поставщика для {itemsBySupplier.noSupplier.length} позиций:
                </p>
                <select
                  value={bulkSupplierId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const supplier = allSuppliers.find(s => s.id.toString() === id);
                    if (supplier) {
                      itemsBySupplier.noSupplier.forEach(item => {
                        cart.updateItemSupplier(item.cartId, supplier.name, supplier.id);
                      });
                      setBulkSupplierId(id);
                    }
                  }}
                  className="w-full h-11 bg-white border border-amber-200 rounded-[12px] px-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                >
                  <option value="">Выберите поставщика...</option>
                  {allSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="mt-8">
              <label className="block text-base font-medium text-gray-500 mb-2">
                Комментарий
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: срочно"
                className="w-full bg-white rounded-[14px] px-4 py-3.5 resize-none text-base placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none border border-gray-100"
                rows={3}
              />
            </div>

            {/* Summary */}
            <div className="mt-4 text-base text-gray-500">
              {cart.items.length} {getPluralForm(cart.items.length, ['ингредиент', 'ингредиента', 'ингредиентов'])}, {supplierNames.length + (itemsBySupplier.noSupplier.length > 0 ? 1 : 0)} {getPluralForm(supplierNames.length + (itemsBySupplier.noSupplier.length > 0 ? 1 : 0), ['поставщик', 'поставщика', 'поставщиков'])}
            </div>

          </>
        )}

        {/* Sticky submit */}
        {cart.items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-3" style={{ background: 'linear-gradient(to top, white 60%, transparent)' }}>
            <div className="max-w-md mx-auto">
              <button
                onClick={handleSubmitOrder}
                disabled={submitState === 'submitting'}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-semibold text-base py-4 rounded-[14px] shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
              >
                {submitState === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Отправка...
                  </span>
                ) : (
                  'Отправить заказ'
                )}
              </button>

              {submitState === 'error' && (
                <p className="text-red-500 text-center mt-3 text-sm">
                  Ошибка при отправке заказа. Попробуйте снова.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// === CartItemRow Component ===
function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  translateUnit,
}: {
  item: CartItem;
  onQuantityChange: (cartId: string, quantity: number) => void;
  onRemove: () => void;
  translateUnit: (u: string) => string;
}) {
  const [editValue, setEditValue] = useState(item.quantity.toString());
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setEditValue(item.quantity.toString());
  }, [item.quantity, focused]);

  const commit = () => {
    const v = parseFloat(editValue);
    if (!isNaN(v) && v >= 0) {
      onQuantityChange(item.cartId, v);
    } else {
      setEditValue(item.quantity.toString());
    }
  };

  const unit = translateUnit(item.unit || 'шт');

  return (
    <div className="flex items-center gap-3 min-h-[52px] active:bg-black/5 transition-colors border-b border-gray-100/80">
      <div className="flex-1 min-w-0 py-2">
        <p className="text-base text-[#1a1008] truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onQuantityChange(item.cartId, Math.max(0, item.quantity - 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors select-none"
          aria-label="Уменьшить"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <div className="relative flex items-center">
          <input
            type="text"
            inputMode="decimal"
            value={focused ? editValue : `${item.quantity} ${unit}`}
            onChange={(e) => {
              const val = e.target.value.replace(/,/g, '.');
              if (val === '' || /^\d*\.?\d*$/.test(val)) setEditValue(val);
            }}
            onFocus={() => { setFocused(true); setEditValue(item.quantity.toString()); }}
            onBlur={() => { setFocused(false); commit(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-12 text-center text-sm font-semibold tabular-nums bg-transparent outline-none"
          />
        </div>
        <button
          onClick={() => onQuantityChange(item.cartId, item.quantity + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-500 text-white active:bg-brand-600 transition-colors select-none"
          aria-label="Увеличить"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 active:text-red-400 active:bg-red-50 transition-colors ml-1"
          aria-label="Удалить"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
