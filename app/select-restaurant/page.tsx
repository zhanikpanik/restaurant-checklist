"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Restaurant {
  id: string;
  name: string;
  logo?: string;
}

export default function SelectRestaurantPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await fetch("/api/restaurants");
      const data = await response.json();
      if (data.success) {
        setRestaurants(data.data || []);
      }
    } catch (error) {
      console.error("Error loading restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectRestaurant = (restaurantId: string) => {
    document.cookie = `restaurant_id=${restaurantId}; path=/; max-age=31536000; SameSite=Lax`;
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-6xl text-center mb-4">🍽️</div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Выберите ресторан
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Выберите ресторан для работы
        </p>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Рестораны не найдены</p>
            <a
              href="/setup"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Подключить ресторан
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => selectRestaurant(restaurant.id)}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-500 rounded-lg transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{restaurant.logo || "🍽️"}</span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {restaurant.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {restaurant.id}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Назад
          </a>
        </div>
      </div>
    </div>
  );
}
