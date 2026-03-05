"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

function FinishSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email") || "";
  const name = searchParams.get("name") || "";
  const restaurantId = searchParams.get("restaurant_id") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || !restaurantId) {
    return (
      <div className="text-center">
        <p className="text-red-500 font-medium">Ошибка: Токен не найден или устарел.</p>
        <Button onClick={() => router.push("/setup")} className="mt-4">
          Вернуться к началу
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          name,
          password,
          restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Аккаунт успешно создан!");
        router.push("/login?registered=true&email=" + encodeURIComponent(email));
      } else {
        setError(data.error || "Произошла ошибка при создании аккаунта");
      }
    } catch (err) {
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-gray-900">Завершение регистрации</h1>
        <p className="text-gray-500 mt-2">Установите пароль для вашего аккаунта</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>

        <Input
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Минимум 8 символов"
          required
        />

        <Input
          label="Подтвердите пароль"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Создать аккаунт
        </Button>
      </form>
    </div>
  );
}

export default function FinishSetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Загрузка...</div>}>
        <FinishSetupContent />
      </Suspense>
    </div>
  );
}
