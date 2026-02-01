"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api-client";

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
  admin: { variant: "default", className: "bg-purple-100 text-purple-800" },
  manager: { variant: "info" },
  staff: { variant: "default" },
  delivery: { variant: "success" },
};

interface UsersTabProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  sections: Section[];
  loading: boolean;
}

export function UsersTab({ users, setUsers, sections, loading }: UsersTabProps) {
  const { data: session } = useSession();
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
      const response = await api.post<User>("/api/users", formData);

      if (response.success && response.data) {
        setUsers((prev) => [...prev, { ...response.data as User, assigned_sections: [] }]);
        setIsAddModalOpen(false);
        resetForm();
      } else {
        setError(response.error || "Ошибка при создании пользователя");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const response = await api.patch("/api/users", {
        id: selectedUser.id,
        role: formData.role,
      });

      if (response.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, role: formData.role } : u
          )
        );
        setIsEditModalOpen(false);
        setSelectedUser(null);
      } else {
        setError(response.error || "Ошибка при обновлении роли");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const handleSaveSections = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.post("/api/user-sections", {
        user_id: selectedUser.id,
        section_ids: selectedSectionIds,
      });

      if (response.success) {
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
        alert(response.error || "Ошибка при сохранении отделов");
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
      const response = await api.delete(`/api/users?id=${user.id}`);

      if (response.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u))
        );
      } else {
        alert(response.error || "Ошибка при деактивации");
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

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">
          Пользователи ({users.length})
        </h2>
        <Button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
        >
          + Добавить пользователя
        </Button>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Нет пользователей
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-600">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Badge variant={user.is_active ? "success" : "default"}>
                  {user.is_active ? "Активен" : "Неактивен"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Роль:</span>
                  <Badge 
                    variant={ROLE_BADGE_PROPS[user.role]?.variant || "default"}
                    className={ROLE_BADGE_PROPS[user.role]?.className}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </div>
                
                <div>
                  <span className="text-gray-500">Отделы:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.assigned_sections && user.assigned_sections.length > 0 ? (
                      user.assigned_sections.map((section) => (
                        <span
                          key={section.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
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
              </div>

              <div className="mt-4 flex gap-2 justify-end border-t pt-3">
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
                  >
                    Деактивировать
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Новый пользователь"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            label="Имя"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Иван Иванов"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="ivan@example.com"
            required
          />
          <Input
            label="Пароль"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Минимум 6 символов"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="staff">Персонал</option>
              <option value="manager">Менеджер</option>
              <option value="delivery">Доставка</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
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
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-600">
              Пользователь: <span className="font-medium text-gray-900">{selectedUser?.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Email: <span className="font-medium text-gray-900">{selectedUser?.email}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Новая роль
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="staff">Персонал</option>
              <option value="manager">Менеджер</option>
              <option value="delivery">Доставка</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
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
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Пользователь: <span className="font-medium text-gray-900">{selectedUser?.name}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Выберите отделы, к которым пользователь будет иметь доступ
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Нет доступных отделов.
              </p>
            ) : (
              sections.map((section) => (
                <label
                  key={section.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSectionIds.includes(section.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xl">{section.emoji}</span>
                  <span className="font-medium text-gray-900">
                    {section.name}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
