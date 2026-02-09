"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Section {
  id: number;
  name: string;
  emoji: string;
  staff_can_send_orders?: boolean;
}

interface DepartmentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section;
  onUpdate: () => void;
}

type TabType = "settings" | "users";

const TABS = [
  { id: "settings", label: "Настройки" },
  { id: "users", label: "Пользователи" },
];

const EMOJI_OPTIONS = ["🍳", "🍺", "🧹", "📦", "🏪", "🍕", "☕", "🥗", "🧊", "🛒"];

export function DepartmentSettingsModal({
  isOpen,
  onClose,
  section,
  onUpdate,
}: DepartmentSettingsModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("settings");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Settings tab state
  const [name, setName] = useState(section.name);
  const [emoji, setEmoji] = useState(section.emoji || "🏪");
  const [staffCanSendOrders, setStaffCanSendOrders] = useState(section.staff_can_send_orders ?? false);

  // Users tab state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormType, setUserFormType] = useState<"existing" | "new">("existing");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userCanSendOrders, setUserCanSendOrders] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    if (isOpen) {
      setName(section.name);
      setEmoji(section.emoji || "🏪");
      setStaffCanSendOrders(section.staff_can_send_orders ?? false);
      if (activeTab === "users") {
        loadUsers();
      }
    }
  }, [isOpen, section, activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load all users
      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      if (usersData.success) {
        setAllUsers(usersData.data);
      }

      // Load assigned users for this section
      const assignedRes = await fetch(`/api/user-sections?section_id=${section.id}`);
      const assignedData = await assignedRes.json();
      if (assignedData.success) {
        setAssignedUserIds(assignedData.data.map((u: User) => u.id));
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!name.trim()) {
      toast.error("Введите название отдела");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.patch("/api/sections", {
        id: section.id,
        name: name.trim(),
        emoji,
        staff_can_send_orders: staffCanSendOrders,
      });

      if (response.success) {
        toast.success("Настройки обновлены");
        onUpdate();
      } else {
        toast.error(response.error || "Ошибка обновления");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Ошибка обновления настроек");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignExistingUser = async () => {
    if (!selectedUserId) {
      toast.error("Выберите пользователя");
      return;
    }

    setSubmitting(true);
    try {
      // First get current sections for this user
      const currentSectionsRes = await fetch(`/api/user-sections?user_id=${selectedUserId}`);
      const currentSectionsData = await currentSectionsRes.json();
      const currentSectionIds = currentSectionsData.success 
        ? currentSectionsData.data.map((s: any) => Number(s.id)) 
        : [];

      // Add the new section to the list (ensure it's a number)
      const newSectionId = Number(section.id);
      if (!currentSectionIds.includes(newSectionId)) {
        currentSectionIds.push(newSectionId);
      }

      console.log("Assigning sections:", { user_id: selectedUserId, section_ids: currentSectionIds, can_send_orders: userCanSendOrders });

      const response = await api.post("/api/user-sections", {
        user_id: selectedUserId,
        section_ids: currentSectionIds,
        can_send_orders: userCanSendOrders,
      });

      if (response.success) {
        toast.success("Пользователь назначен");
        setAssignedUserIds([...assignedUserIds, selectedUserId]);
        setShowUserForm(false);
        setSelectedUserId(null);
        setUserCanSendOrders(false);
      } else {
        toast.error(response.error || "Ошибка назначения");
      }
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Ошибка назначения пользователя");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndAssignUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      toast.error("Заполните все поля");
      return;
    }

    setSubmitting(true);
    try {
      // Create user
      const createResponse = await api.post("/api/users", {
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        role: newUserForm.role,
      });

      if (!createResponse.success) {
        toast.error(createResponse.error || "Ошибка создания пользователя");
        return;
      }

      const newUser = createResponse.data as User;

      // Assign to section
      const assignResponse = await api.post("/api/user-sections", {
        user_id: newUser.id,
        section_ids: [Number(section.id)],
        can_send_orders: userCanSendOrders,
      });

      if (assignResponse.success) {
        toast.success("Пользователь создан и назначен");
        setAllUsers([...allUsers, newUser]);
        setAssignedUserIds([...assignedUserIds, newUser.id]);
        setShowUserForm(false);
        setNewUserForm({ name: "", email: "", password: "", role: "staff" });
        setUserCanSendOrders(false);
      } else {
        toast.error(assignResponse.error || "Ошибка назначения");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Ошибка создания пользователя");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignUser = async (userId: number) => {
    if (!confirm("Удалить пользователя из этого отдела?")) return;

    try {
      const response = await api.delete(`/api/user-sections?user_id=${userId}&section_id=${section.id}`);

      if (response.success) {
        toast.success("Пользователь удален из отдела");
        setAssignedUserIds(assignedUserIds.filter((id) => id !== userId));
      } else {
        toast.error(response.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Error unassigning user:", error);
      toast.error("Ошибка удаления пользователя");
    }
  };

  const assignedUsers = allUsers.filter((u) => assignedUserIds.includes(u.id));
  const unassignedUsers = allUsers.filter((u) => !assignedUserIds.includes(u.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`⚙️ Настройки: ${section.name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <Input
              label="Название отдела"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Кухня"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Иконка
              </label>
              <div className="grid grid-cols-5 gap-2">
                {EMOJI_OPTIONS.map((emojiOption) => (
                  <button
                    key={emojiOption}
                    type="button"
                    onClick={() => setEmoji(emojiOption)}
                    className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                      emoji === emojiOption
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {emojiOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Персонал может отправлять заказы
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Если выключено, только менеджер может отправлять заказы
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffCanSendOrders(!staffCanSendOrders)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  staffCanSendOrders ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    staffCanSendOrders ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSaveSettings} className="flex-1" disabled={submitting}>
                {submitting ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Загрузка пользователей...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">
                    Назначенные пользователи ({assignedUsers.length})
                  </h3>
                  {!showUserForm && (
                    <button
                      onClick={() => setShowUserForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Добавить
                    </button>
                  )}
                </div>

                {/* Add User Form */}
                {showUserForm && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUserFormType("existing")}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                          userFormType === "existing"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Существующий
                      </button>
                      <button
                        onClick={() => setUserFormType("new")}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                          userFormType === "new"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Новый
                      </button>
                    </div>

                    {userFormType === "existing" ? (
                      <>
                        <select
                          value={selectedUserId || ""}
                          onChange={(e) => setSelectedUserId(Number(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="">Выберите пользователя</option>
                          {unassignedUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                        
                        {/* Can Send Orders Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <label className="text-sm font-medium text-gray-700">
                            Может отправлять заказы
                          </label>
                          <button
                            type="button"
                            onClick={() => setUserCanSendOrders(!userCanSendOrders)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userCanSendOrders ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userCanSendOrders ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setShowUserForm(false);
                              setSelectedUserId(null);
                              setUserCanSendOrders(false);
                            }}
                            className="flex-1"
                          >
                            Отмена
                          </Button>
                          <Button
                            onClick={handleAssignExistingUser}
                            className="flex-1"
                            disabled={submitting || !selectedUserId}
                          >
                            Назначить
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Input
                          label="Имя"
                          value={newUserForm.name}
                          onChange={(e) =>
                            setNewUserForm({ ...newUserForm, name: e.target.value })
                          }
                          placeholder="Иван Иванов"
                        />
                        <Input
                          label="Email"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) =>
                            setNewUserForm({ ...newUserForm, email: e.target.value })
                          }
                          placeholder="ivan@example.com"
                        />
                        <Input
                          label="Пароль"
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) =>
                            setNewUserForm({ ...newUserForm, password: e.target.value })
                          }
                          placeholder="Минимум 6 символов"
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Роль
                          </label>
                          <select
                            value={newUserForm.role}
                            onChange={(e) =>
                              setNewUserForm({ ...newUserForm, role: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 py-2"
                          >
                            <option value="staff">Персонал</option>
                            <option value="manager">Менеджер</option>
                            <option value="delivery">Доставка</option>
                          </select>
                        </div>
                        
                        {/* Can Send Orders Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <label className="text-sm font-medium text-gray-700">
                            Может отправлять заказы
                          </label>
                          <button
                            type="button"
                            onClick={() => setUserCanSendOrders(!userCanSendOrders)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              userCanSendOrders ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                userCanSendOrders ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setShowUserForm(false);
                              setNewUserForm({ name: "", email: "", password: "", role: "staff" });
                              setUserCanSendOrders(false);
                            }}
                            className="flex-1"
                          >
                            Отмена
                          </Button>
                          <Button
                            onClick={handleCreateAndAssignUser}
                            className="flex-1"
                            disabled={submitting}
                          >
                            Создать
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Assigned Users List */}
                {assignedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Нет назначенных пользователей
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                        </div>
                        <button
                          onClick={() => handleUnassignUser(user.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
