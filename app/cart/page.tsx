"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart, useRestaurant, useStore } from "@/store/useStore";
import { api } from "@/lib/api-client";
import { getUserRootUrl } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuantityInput } from "@/components/ui/QuantityInput";
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
        unit: item.unit || "шт", // Default to "шт" if not specified
        category: item.category,
        supplier: item.supplier,
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
        setSubmittedOrderId(response.data?.id || null);
        setSubmitState('success');
        // Clear cart immediately after successful order
        cart.clear();
        setNotes("");
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
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Готово"
          backHref={backLink}
          rightContent={restaurant.current?.name || "Ресторан"}
        />

        {/* Success Content */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-8">
              Заказ успешно отправлен
            </h2>
            
            <div className="space-y-3 max-w-sm mx-auto">
              <button
                onClick={() => router.push('/orders')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Посмотреть в заказах
              </button>
              <button
                onClick={handleNewOrder}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors"
              >
                Создать новый заказ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Корзина"
        backHref={backLink}
        rightContent={restaurant.current?.name || "Ресторан"}
      />

      {/* Cart Content */}
      <div className="max-w-4xl mx-auto p-4">
        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <img src="/icons/basket.svg" alt="Empty Cart" className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Корзина пуста
            </h2>
            <p className="text-gray-500 mb-6">
              Добавьте товары из каталога для создания заказа
            </p>
            <Link
              href="/"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Перейти к выбору товаров
            </Link>
          </div>
        ) : (
          <>
            {/* Items List - Grouped by Supplier */}
            <div className="space-y-6">
              {supplierNames.map((supplierName) => (
                <div key={supplierName}>
                  {/* Supplier Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <img src="/icons/box.svg" alt="Supplier" className="w-5 h-5 opacity-70" />
                    <h3 className="font-semibold text-gray-800">{supplierName}</h3>
                    <span className="text-sm text-gray-500">
                      ({formatProductCount(itemsBySupplier.grouped[supplierName].length)})
                    </span>
                  </div>
                  
                  {/* Items for this supplier */}
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {itemsBySupplier.grouped[supplierName].map((item) => (
                      <CartItemRow
                        key={item.cartId}
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={() => cart.remove(item.cartId)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Items without supplier */}
              {itemsBySupplier.noSupplier.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <img src="/icons/box.svg" alt="Unassigned" className="w-5 h-5 opacity-70" />
                    <h3 className="font-semibold text-gray-800">Без поставщика</h3>
                    <span className="text-sm text-gray-500">
                      ({formatProductCount(itemsBySupplier.noSupplier.length)})
                    </span>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {itemsBySupplier.noSupplier.map((item) => (
                      <CartItemRow
                        key={item.cartId}
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={() => cart.remove(item.cartId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section - No card wrapper */}
            <div className="mt-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Примечание к заказу
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Добавьте комментарий к заказу..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={3}
              />
            </div>

            {/* Divider line before Total */}
            <div className="border-t border-black/30 my-6" />

            {/* Order Summary - No card wrapper */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Всего позиций:</span>
                <span className="font-semibold">{cart.items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Общее количество:</span>
                <span className="font-semibold">{cart.count}</span>
              </div>
            </div>

            {/* Submit Button Only */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitState === 'submitting'}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-4 rounded-lg font-medium transition-colors text-lg"
            >
              {submitState === 'submitting' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Отправка...
                </span>
              ) : (
                "Отправить заказ"
              )}
            </button>

            {/* Error state */}
            {submitState === 'error' && (
              <p className="text-red-500 text-center mt-4">
                Ошибка при отправке заказа. Попробуйте снова.
              </p>
            )}
          </>
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
}: {
  item: CartItem;
  onQuantityChange: (cartId: string, quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-medium text-gray-800 truncate">{item.name}</h4>
          <p className="text-sm text-gray-500">{item.unit}</p>
        </div>
        <div className="flex items-center gap-2">
          <QuantityInput
            productName={item.name}
            quantity={item.quantity}
            unit={item.unit}
            onQuantityChange={(newQty) => onQuantityChange(item.cartId, newQty)}
            compact={true}
          />
          <button
            onClick={onRemove}
            className="w-9 h-9 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
            aria-label="Удалить"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
