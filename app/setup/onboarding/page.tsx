"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurant_id");

  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runSync = async () => {
      if (!restaurantId) {
        setError("Restaurant ID is missing");
        setSyncing(false);
        return;
      }

      try {
        const response = await fetch("/api/sync-sections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-restaurant-id": restaurantId
          }
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to sync initial data");
        }
      } catch (err) {
        setError("Network error during sync");
      } finally {
        setSyncing(false);
      }
    };

    runSync();
  }, [restaurantId]);

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl flex flex-col p-8 text-center">
      {syncing ? (
        <>
          <div className="animate-spin h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Настраиваем ваш аккаунт...</h1>
          <p className="text-gray-500 mb-8">
            Загружаем отделы и ингредиенты из Poster. Это может занять несколько секунд.
          </p>
        </>
      ) : error ? (
        <>
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Ошибка синхронизации</h1>
          <p className="text-gray-500 mb-8">
            {error}. Вы можете повторить синхронизацию позже из панели управления.
          </p>
          <Button 
            onClick={() => router.push("/login?registered=true")} 
            className="w-full py-4 text-lg shadow-lg shadow-brand-500/20 bg-brand-500 hover:bg-brand-600 text-white" 
          >
            Всё равно войти
          </Button>
        </>
      ) : (
        <>
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Отлично! Всё готово.</h1>
          <p className="text-gray-500 mb-8">
            Ваш ресторан успешно подключен к Poster и данные загружены.
          </p>
          <Button 
            onClick={() => router.push("/login?registered=true")} 
            className="w-full py-4 text-lg shadow-lg shadow-brand-500/20 bg-brand-500 hover:bg-brand-600 text-white" 
          >
            Войти в систему
          </Button>
        </>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Загрузка...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
