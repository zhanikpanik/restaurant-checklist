"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
  is_active: boolean;
  last_login?: string;
  assigned_sections?: Section[];
}

interface Section {
  id: number;
  name: string;
  emoji: string;
}

interface UserFormData {
  email: string;
  password?: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  staff: "Персонал",
  delivery: "Доставка",
};

const ROLE_BADGE_PROPS: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info", className?: string }> = {
  admin: { variant: "default", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  manager: { variant: "info" },
  staff: { variant: "default" },
  delivery: { variant: "success" },
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSectionsModalOpen, setIsSectionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    name: "",
    role: "staff",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session.user.role !== "admin") {
        router.push("/");
        return;
      }
      fetchUsers();
      fetchSections();
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        // Fetch sections for each user
        const usersWithSections = await Promise.all(
          data.data.map(async (user: User) => {
            const sectionsRes = await fetch(`/api/user-sections?user_id=${user.id}`);
            const sectionsData = await sectionsRes.json();
            return {
              ...user,
              assigned_sections: sectionsData.success ? sectionsData.data : [],
            };
          })
        );
        setUsers(usersWithSections);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/sections");
      const data = await res.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "staff",
    });
    setError("");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password || !formData.name) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setUsers((prev) => [...prev, { ...data.data, assigned_sections: [] }]);
        setIsAddModalOpen(false);
        resetForm();
      } else {
        setError(data.error || "Ошибка при создании пользователя");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          role: formData.role,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, role: formData.role } : u
          )
        );
        setIsEditModalOpen(false);
        setSelectedUser(null);
      } else {
        setError(data.error || "Ошибка при обновлении роли");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleSaveSections = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch("/api/user-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          section_ids: selectedSectionIds,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Update user's sections in local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  assigned_sections: sections.filter((s) =>
                    selectedSectionIds.includes(s.id)
                  ),
                }
              : u
          )
        );
        setIsSectionsModalOpen(false);
        setSelectedUser(null);
      } else {
        alert(data.error || "Ошибка при сохранении отделов");
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Вы уверены, что хотите деактивировать пользователя ${user.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u))
        );
      } else {
        alert(data.error || "Ошибка при деактивации");
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  const openSectionsModal = (user: User) => {
    setSelectedUser(user);
    setSelectedSectionIds(user.assigned_sections?.map((s) => s.id) || []);
    setIsSectionsModalOpen(true);
  };

  const toggleSection = (sectionId: number) => {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Назад
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Пользователи
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Управление доступом сотрудников
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          leftIcon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          Добавить пользователя
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <Badge
                variant={user.is_active ? "success" : "default"}
                className="text-xs"
              >
                {user.is_active ? "Активен" : "Неактивен"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Роль:</span>
                <Badge 
                  variant={ROLE_BADGE_PROPS[user.role]?.variant || "default"}
                  className={ROLE_BADGE_PROPS[user.role]?.className}
                >
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Отделы:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.assigned_sections && user.assigned_sections.length > 0 ? (
                    user.assigned_sections.map((section) => (
                      <span
                        key={section.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs"
                      >
                        {section.emoji} {section.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      Нет назначенных отделов
                    </span>
                  )}
                </div>
              </div>

              {user.last_login && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Вход:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(user.last_login).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end border-t pt-4 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openSectionsModal(user)}
                disabled={!user.is_active}
              >
                Отделы
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(user)}
                disabled={!user.is_active}
              >
                Роль
              </Button>
              {user.is_active && user.id !== parseInt(session?.user?.id || "0") && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeactivate(user)}
                  title="Деактивировать"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Новый пользователь"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Имя
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Иван Иванов"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="ivan@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Пароль
            </label>
            <Input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Минимум 6 символов"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Роль
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="staff">Персонал</option>
              <option value="manager">Менеджер</option>
              <option value="delivery">Доставка</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Изменение роли"
      >
        <form onSubmit={handleEditRole} className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Пользователь: <span className="font-medium text-gray-900 dark:text-white">{selectedUser?.name}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Email: <span className="font-medium text-gray-900 dark:text-white">{selectedUser?.email}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Новая роль
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="staff">Персонал</option>
              <option value="manager">Менеджер</option>
              <option value="delivery">Доставка</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </Modal>

      {/* Sections Assignment Modal */}
      <Modal
        isOpen={isSectionsModalOpen}
        onClose={() => setIsSectionsModalOpen(false)}
        title="Назначение отделов"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Пользователь: <span className="font-medium text-gray-900 dark:text-white">{selectedUser?.name}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Выберите отделы, к которым пользователь будет иметь доступ
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Нет доступных отделов. Сначала синхронизируйте отделы из Poster.
              </p>
            ) : (
              sections.map((section) => (
                <label
                  key={section.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSectionIds.includes(section.id)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xl">{section.emoji}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {section.name}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSectionsModalOpen(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveSections}>
              Сохранить ({selectedSectionIds.length} отделов)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
