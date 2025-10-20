"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, useRestaurant } from "@/store/useStore";
import type { CartItem } from "@/types";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const restaurant = useRestaurant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const handleQuantityChange = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      cart.remove(cartId);
    } else {
      cart.updateQuantity(cartId, newQuantity);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.items.length === 0) {
      alert("Корзина пуста");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: "general",
          items: cart.items,
          notes: notes,
          created_by: "user",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Заказ успешно отправлен!");
        cart.clear();
        router.push("/delivery");
      } else {
        throw new Error(data.error || "Failed to submit order");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Ошибка при отправке заказа. Попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedItems = cart.items.reduce((acc, item) => {
    const category = item.category || "Без категории";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

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
                🛒 Корзина
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
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Корзина пуста
            </h2>
            <p className="text-gray-500 mb-6">
              Добавьте товары из каталога для создания заказа
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Перейти к выбору товаров
            </Link>
          </div>
        ) : (
          <>
            {/* Items by Category */}
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">
                  {category}
                </h3>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {items.map((item) => (
                    <div
                      key={item.cartId}
                      className="border-b last:border-b-0 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">
                            {item.name}
                          </h4>
                          {item.supplier && (
                            <p className="text-sm text-gray-500">
                              Поставщик: {item.supplier}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  item.cartId,
                                  item.quantity - 1
                                )
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                            >
                              -
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
                              className="w-16 text-center border rounded px-2 py-1"
                            />
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  item.cartId,
                                  item.quantity + 1
                                )
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm text-gray-500 w-12">
                            {item.unit}
                          </span>
                          <button
                            onClick={() => cart.remove(item.cartId)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Примечание к заказу
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Добавьте комментарий к заказу..."
                className="w-full border rounded-lg px-3 py-2 resize-none"
                rows={3}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Всего позиций:</span>
                <span className="font-semibold">{cart.items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Общее количество:</span>
                <span className="font-semibold">{cart.count}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => cart.clear()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors"
              >
                Очистить корзину
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? "Отправка..." : "Отправить заказ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}