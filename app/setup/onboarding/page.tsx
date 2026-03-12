"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

function OnboardingContent() {
  const router = useRouter();

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl flex flex-col p-8 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Отлично! Всё готово.</h1>
      <p className="text-gray-500 mb-8">
        Ваш ресторан успешно подключен к Poster. База данных синхронизируется в фоновом режиме.
      </p>
      
      <Button 
        onClick={() => router.push("/login?registered=true")} 
        className="w-full py-4 text-lg shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white" 
      >
        Войти в систему
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Загрузка...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
