"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InvitationData {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  restaurant_name: string;
  restaurant_id: string;
  sections: {
    section_id: number;
    section_name: string;
    section_emoji: string;
    can_send_orders: boolean;
    can_receive_supplies: boolean;
  }[];
  expires_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  staff: "Персонал",
  delivery: "Доставка",
};

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const res = await fetch(`/api/invitations/${token}`);
      const data = await res.json();

      if (data.success) {
        setInvitation(data.data);
        // Pre-fill if admin provided
        setFormData(prev => ({
          ...prev,
          name: data.data.name || "",
          email: data.data.email || "",
        }));
      } else {
        setError(data.error || "Приглашение недействительно");
      }
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Ошибка загрузки приглашения");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name.trim()) {
      setError("Укажите имя");
      return;
    }
    if (!formData.email.trim()) {
      setError("Укажите email");
      return;
    }
    if (formData.password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Registration successful - redirect to login
        router.push(`/login?registered=true&email=${encodeURIComponent(formData.email.trim())}`);
      } else {
        setError(data.error || "Ошибка регистрации");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Ошибка сети");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-50">
        <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Приглашение недействительно
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-brand-500 text-white px-6 py-3 rounded-lg hover:bg-brand-600 transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-6">
            <img src="/icons/logo.svg" alt="Logo" className="w-20 h-20" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Добро пожаловать!
          </h1>
          <p className="text-gray-600">
            Вас пригласили в <strong>{invitation?.restaurant_name}</strong>
          </p>
        </div>

        {/* Invitation Info */}
        {invitation && (
          <div className="bg-gradient-to-r from-brand-50 to-brand-50 rounded-lg p-4 mb-6 border border-brand-200">
            <div className="text-sm space-y-2">
              <p className="text-brand-900">
                <strong>Должность:</strong> {ROLE_LABELS[invitation.role] || invitation.role}
              </p>
              <div>
                <p className="text-brand-900 font-semibold mb-2">
                  Доступ к отделам:
                </p>
                <div className="flex flex-wrap gap-1">
                  {invitation.sections.map((s) => (
                    <span
                      key={s.section_id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-brand-200 text-brand-900 rounded text-xs"
                    >
                      <span>{s.section_emoji}</span>
                      <span>{s.section_name}</span>
                      {s.can_send_orders && (
                        <span title="Может отправлять заказы" className="text-green-600">📤</span>
                      )}
                      {s.can_receive_supplies && (
                        <span title="Может принимать поставки" className="text-brand-500">📦</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ваше имя *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Иван Иванов"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ivan@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Придумайте пароль *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Минимум 6 символов"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              required
              minLength={6}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Повторите пароль *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Повторите пароль"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Регистрация...
              </>
            ) : (
              "Создать аккаунт"
            )}
          </button>
        </form>

        {/* Footer */}
        {invitation && (
          <p className="text-xs text-gray-500 text-center mt-6">
            Ссылка действительна до {new Date(invitation.expires_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
