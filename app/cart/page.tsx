"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, useRestaurant, useStore } from "@/store/useStore";
import type { CartItem } from "@/types";

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const restaurant = useRestaurant();
  const currentSection = useStore((state) => state.currentSection);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [notes, setNotes] = useState("");
  const [submittedOrderId, setSubmittedOrderId] = useState<number | null>(null);

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

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: currentSection?.name || "Общий",
          items: formattedItems,
          notes: notes,
          created_by: "user",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmittedOrderId(data.data?.id || null);
        setSubmitState('success');
        // Don't clear cart immediately - allow user to add more
      } else {
        throw new Error(data.error || "Failed to submit order");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      setSubmitState('error');
    }
  };

  const handleAddMore = () => {
    // Keep cart items but go back to add more
    router.push("/");
  };

  const handleNewOrder = () => {
    cart.clear();
    setNotes("");
    setSubmitState('idle');
    setSubmittedOrderId(null);
  };

  const handleGoHome = () => {
    cart.clear();
    router.push("/");
  };

  // Success state view
  if (submitState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-800">
                Заказ отправлен
              </h1>
              <div className="text-sm text-gray-600">
                {restaurant.current?.name || "Ресторан"}
              </div>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Заказ успешно отправлен!
            </h2>
            {submittedOrderId && (
              <p className="text-gray-500 mb-8">
                Номер заказа: #{submittedOrderId}
              </p>
            )}
            
            <div className="space-y-3 max-w-sm mx-auto">
              <button
                onClick={handleAddMore}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Добавить ещё товары
              </button>
              <button
                onClick={handleNewOrder}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors"
              >
                Новый заказ
              </button>
              <button
                onClick={handleGoHome}
                className="w-full text-gray-500 hover:text-gray-700 py-2 font-medium transition-colors"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Назад
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">
                Корзина
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {restaurant.current?.name || "Ресторан"}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Content */}
      <div className="max-w-4xl mx-auto p-4">
        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
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
            {/* Items List - No card wrapper */}
            <div className="space-y-0">
              {cart.items.map((item, index) => (
                <div
                  key={item.cartId}
                  className={`py-4 ${index !== cart.items.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-medium text-gray-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Quantity controls - 36px buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.cartId,
                              item.quantity - 1
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors text-lg font-medium"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.cartId,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-14 text-center border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        />
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.cartId,
                              item.quantity + 1
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors text-lg font-medium"
                        >
                          +
                        </button>
                      </div>
                      {/* Delete button - moved to far right, subtle */}
                      <button
                        onClick={() => cart.remove(item.cartId)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
