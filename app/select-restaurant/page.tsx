"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SelectRestaurantPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to home page
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-6xl text-center mb-4">🔒</div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Доступ ограничен
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Выбор ресторана отключен по соображениям безопасности
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Примечание:</strong> Эта функция была отключена для предотвращения несанкционированного доступа к данным других ресторанов.
          </p>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}
