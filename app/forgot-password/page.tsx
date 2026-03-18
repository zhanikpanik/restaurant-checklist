"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Произошла ошибка");
      }
    } catch (err) {
      setError("Ошибка сети. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        
        <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад к входу
        </Link>

        <div className="flex justify-center mb-6">
          <img src="/icons/logo.svg" alt="Logo" className="w-16 h-16" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Забыли пароль?</h1>
        <p className="text-gray-600 mb-8">
          Введите ваш email, и мы отправим вам ссылку для создания нового пароля.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="font-semibold mb-2">Письмо отправлено!</h3>
            <p className="text-sm opacity-90">
              Если аккаунт с таким email существует, вы получите письмо со ссылкой для сброса пароля. 
              Не забудьте проверить папку Спам.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="name@example.com"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Отправить ссылку"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
