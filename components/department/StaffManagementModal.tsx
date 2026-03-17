"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
  can_send_orders?: boolean;
  can_receive_supplies?: boolean;
}

interface Section {
  id: number;
  name: string;
  emoji: string;
}

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section | null;
  onUpdate: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  manager: "Менеджер",
  staff: "Персонал",
  delivery: "Доставка",
};

export function StaffManagementModal({
  isOpen,
  onClose,
  section,
  onUpdate,
}: StaffManagementModalProps) {
  const { data: session } = useSession();
  const toast = useToast();
  
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // For assign existing
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Invitation result
  const [invitationUrl, setInvitationUrl] = useState("");
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // For delete dropdown menu
  const [deleteMenuUserId, setDeleteMenuUserId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && section) {
      loadAssignedUsers();
      loadAllUsers();
    }
  }, [isOpen, section]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deleteMenuUserId !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.dropdown-menu-container')) {
          setDeleteMenuUserId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [deleteMenuUserId]);

  const loadAssignedUsers = async () => {
    if (!section) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/user-sections?section_id=${section.id}`);
      const data = await res.json();
      
      if (data.success) {
        setAssignedUsers(data.data);
      }
    } catch (error) {
      console.error("Error loading assigned users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleTogglePermission = async (
    userId: number,
    permission: "can_send_orders" | "can_receive_supplies",
    currentValue: boolean
  ) => {
    const newValue = !currentValue;
    const previousUsers = [...assignedUsers];

    // Optimistic update
    setAssignedUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, [permission]: newValue } : u
    ));

    try {
      const res = await api.patch("/api/user-sections", {
        user_id: userId,
        section_id: section?.id,
        [permission]: newValue,
      });

      if (!res.success) {
        setAssignedUsers(previousUsers);
        toast.error(res.error || "Ошибка обновления");
      }
    } catch (error) {
      setAssignedUsers(previousUsers);
      toast.error("Ошибка сети");
    }
  };

  const handleRemoveUser = async (userId: number, userName: string) => {
    if (!confirm(`Удалить ${userName} из отдела "${section?.name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/user-sections?user_id=${userId}&section_id=${section?.id}`);
      
      if (res.success) {
        toast.success("Пользователь исключен");
        await loadAssignedUsers();
        await loadAllUsers();
        onUpdate();
      } else {
        toast.error(res.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Ошибка сети");
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`⚠️ Удалить аккаунт "${userName}"?\n\nЭто навсегда деактивирует аккаунт и удалит его из всех отделов.`)) {
      return;
    }

    setDeleteMenuUserId(null); // Close menu
    
    try {
      const res = await api.delete(`/api/users?id=${userId}`);
      
      if (res.success) {
        toast.success("Аккаунт удален");
        loadAssignedUsers();
        loadAllUsers();
        onUpdate();
      } else {
        toast.error(res.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Ошибка сети");
    }
  };

  const handleCreateInvitation = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/api/invitations", {
        role: "staff",
        sections: [
          {
            section_id: section?.id,
            can_send_orders: false,
            can_receive_supplies: false,
          },
        ],
        expires_in_days: 7,
      });

      const data = res as any;

      if (data.success) {
        setInvitationUrl(data.data.url);
        setShowInviteSuccess(true);
      } else {
        toast.error(data.error || "Ошибка создания приглашения");
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignExistingDirectly = async (userId: number) => {
    setSubmitting(true);
    try {
      const res = await api.post("/api/user-sections", {
        user_id: userId,
        mode: "add",
        sections: [
          {
            section_id: section?.id,
            can_send_orders: false,
            can_receive_supplies: false,
          },
        ],
      });

      if (res.success) {
        toast.success("Пользователь добавлен");
        await loadAssignedUsers();
        await loadAllUsers();
        onUpdate();
      } else {
        toast.error(res.error || "Ошибка добавления");
      }
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `Приглашение в ${session?.user?.restaurantName || "ресторан"}\n${invitationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = `Приглашение в ${session?.user?.restaurantName || "ресторан"}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(invitationUrl)}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const unassignedUsers = allUsers.filter(
    (u) => !assignedUsers.some((au) => au.id === u.id)
  );

  if (!section) return null;

  // Success screen after creating invitation
  if (showInviteSuccess) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setShowInviteSuccess(false);
          onClose();
        }}
        title="✅ Приглашение создано!"
      >
        <div className="text-center pt-2">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-1">Ссылка готова!</h3>
          <p className="text-sm text-gray-500 mb-8 px-4">
            Отправьте эту ссылку сотруднику. Она будет действительна в течение 24 часов.
          </p>

          {/* Link Section */}
          <div className="mb-8 group">
            <div 
              onClick={copyToClipboard}
              className="relative flex flex-col items-center p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-blue-300 transition-all group"
            >
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Ссылка для регистрации</span>
              <code className="text-brand-500 font-mono text-sm break-all text-center mb-3 px-2">
                {invitationUrl}
              </code>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'}`}>
                {copied ? (
                  <><span>✓</span> Скопировано</>
                ) : (
                  <><span>📋</span> Копировать</>
                )}
              </div>
            </div>
          </div>

          {/* Share buttons */}
          <div className="space-y-3 mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Поделиться</p>
            
            <button
              onClick={shareViaWhatsApp}
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 rounded-xl hover:bg-[#20bd5a] transition-all shadow-lg shadow-green-200 font-bold"
            >
              WhatsApp
            </button>

            <button
              onClick={shareViaTelegram}
              className="w-full flex items-center justify-center gap-3 bg-[#0088cc] text-white py-4 rounded-xl hover:bg-[#0077b5] transition-all font-bold"
            >
              Telegram
            </button>
          </div>

          <Button
            onClick={() => {
              setShowInviteSuccess(false);
              onClose();
            }}
            className="w-full py-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold"
          >
            Готово
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Персонал — ${section.name}`}
      size="lg"
    >
      {/* Scrollable content area */}
      <div className="flex flex-col max-h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          {/* 1. Assigned Users List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center justify-between">
              <span>Текущая команда</span>
              {assignedUsers.length > 0 && (
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {assignedUsers.length}
                </span>
              )}
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : assignedUsers.length > 0 ? (
              <div className="space-y-2">
                {assignedUsers.map((user) => (
                  <div key={user.id} className="relative group border border-gray-200 rounded-lg p-3 hover:border-brand-200 transition-colors bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">{ROLE_LABELS[user.role] || user.role}</p>
                        </div>
                      </div>
                      
                      {/* Three-dot menu */}
                      <div className="relative dropdown-menu-container">
                        <button
                          onClick={() => setDeleteMenuUserId(deleteMenuUserId === user.id ? null : user.id)}
                          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                          title="Опции"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {/* Dropdown menu */}
                        {deleteMenuUserId === user.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                            <button
                              onClick={() => {
                                setDeleteMenuUserId(null);
                                handleRemoveUser(user.id, user.name);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              Исключить из отдела
                            </button>
                            <div className="border-t border-gray-100" />
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              Удалить аккаунт
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permission toggles - vertical list */}
                    <div className="space-y-2 pl-0 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Создание заявок</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(user.id, "can_send_orders", user.can_send_orders || false)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            user.can_send_orders ? "bg-brand-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              user.can_send_orders ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Приемка товара</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(user.id, "can_receive_supplies", user.can_receive_supplies || false)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            user.can_receive_supplies ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              user.can_receive_supplies ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">В этом отделе еще нет персонала.</p>
              </div>
            )}
          </div>

          {/* 2. Available Users List (Add Existing) */}
          {unassignedUsers.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h3 className="font-semibold text-gray-900 text-sm">Добавить из списка</h3>
              <div className="space-y-2">
                {unassignedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[u.role]}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignExistingDirectly(u.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:border-brand-500 hover:text-brand-500 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      <span>+ Добавить</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Invite New Staff - Simple button only */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="font-semibold text-gray-900 text-sm">Пригласить сотрудника</h3>
            <p className="text-xs text-gray-500">Создайте ссылку для регистрации новых сотрудников. Вы сможете настроить их права после того, как они зарегистрируются.</p>
          </div>
        </div>

        <div className="pt-4 mt-4 bg-white">
          <Button 
            onClick={handleCreateInvitation} 
            disabled={submitting} 
            className="w-full justify-center py-3 text-base"
          >
            {submitting ? "Создание..." : "Создать ссылку-приглашение"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
