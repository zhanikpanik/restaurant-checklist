"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Restaurant {
  id: string;
  name: string;
  logo?: string;
}

export default function DevSwitchRestaurantPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const router = useRouter();

  // Check if in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Get current restaurant from cookie
    const cookies = document.cookie.split(';');
    const restaurantCookie = cookies.find(c => c.trim().startsWith('restaurant_id='));
    if (restaurantCookie) {
      setCurrentRestaurantId(restaurantCookie.split('=')[1]);
    }

    if (isDevelopment) {
      loadRestaurants();
    } else {
      setLoading(false);
    }
  }, [isDevelopment]);

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

  // Production mode - show access denied
  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-6xl text-center mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 text-center mb-6">
            This page is only available in development mode
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>Note:</strong> Restaurant switching is disabled in production for security reasons.
            </p>
          </div>
          <div className="text-center">
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Development mode - show restaurant switcher
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-6xl text-center mb-4">🔧</div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Dev: Switch Restaurant
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Development mode only
        </p>

        {currentRestaurantId && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800 text-center">
              Current: <strong>{currentRestaurantId}</strong>
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No restaurants found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => selectRestaurant(restaurant.id)}
                className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                  restaurant.id === currentRestaurantId
                    ? 'bg-purple-50 border-purple-500'
                    : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-500'
                }`}
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
                  {restaurant.id === currentRestaurantId && (
                    <span className="ml-auto text-purple-600 text-sm font-medium">
                      ✓ Active
                    </span>
                  )}
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
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
