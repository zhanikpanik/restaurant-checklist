"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { api } from "@/lib/api-client";
import { clientCache, fetchWithCache } from "@/lib/client-cache";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
  is_active: boolean;
  last_login?: string;
  can_send_orders?: boolean;
  can_receive_supplies?: boolean;
  assigned_sections?: Section[];
}

interface Section {
  id: number;
  name: string;
  emoji: string;
}

const ALL_ROLES = [
  { id: "staff", label: "Персонал" },
  { id: "manager", label: "Менеджер" },
  { id: "admin", label: "Админ" },
  { id: "delivery", label: "Доставка" },
] as const;

const ASSIGNABLE_ROLES = [
  { id: "staff", label: "Персонал" },
  { id: "manager", label: "Менеджер" },
] as const;

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(() => clientCache.get("team_users") || []);
  const [sections, setSections] = useState<Section[]>(() => clientCache.get("team_sections") || []);
  const [loading, setLoading] = useState(!clientCache.has("team_users"));
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "staff" | "delivery">("staff");
  const [inviteSections, setInviteSections] = useState<number[]>([]);
  const [inviteCanSend, setInviteCanSend] = useState(false);
  const [inviteCanReceive, setInviteCanReceive] = useState(false);
  
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (!["admin", "manager"].includes(session.user.role)) {
        router.push("/");
        return;
      }
      Promise.all([fetchUsers(), fetchSections()]).finally(() => {
        setLoading(false);
      });
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const data = await fetchWithCache("/api/users");
      if (data?.success) {
        const usersWithSections = await Promise.all(
          data.data.map(async (user: User) => {
            const sectionsData = await fetchWithCache(`/api/user-sections?user_id=${user.id}`);
            return {
              ...user,
              assigned_sections: sectionsData?.success ? sectionsData.data : [],
            };
          })
        );
        setUsers(usersWithSections);
        clientCache.set("team_users", usersWithSections);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await fetchWithCache("/api/sections");
      if (data?.success) {
        setSections(data.data);
        clientCache.set("team_sections", data.data);
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setError("");
    try {
      if (sections.length === 0) {
        setError("Сначала синхронизируйте хотя бы один отдел из Poster.");
        setInviteLoading(false);
        return;
      }

      const isManagerOrAdmin = ["admin", "manager"].includes(inviteRole);
      const sectionsToAssign = isManagerOrAdmin 
        ? sections.map(s => s.id) 
        : inviteSections;

      if (!isManagerOrAdmin && sectionsToAssign.length === 0) {
        setError("Выберите хотя бы один отдел");
        setInviteLoading(false);
        return;
      }

      const res = await api.post<{ url: string }>("/api/invitations", {
        role: inviteRole,
        can_send_orders: inviteCanSend,
        can_receive_supplies: inviteCanReceive,
        sections: sectionsToAssign.map(id => ({
          section_id: id,
          can_send_orders: true,
          can_receive_supplies: true
        })),
        expires_in_days: 7,
      });

      if (res.success && res.data) {
        setInviteUrl(res.data.url);
      } else {
        setError(res.error || "Ошибка генерации ссылки");
      }
    } catch (err) {
      setError("Ошибка сети");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: "admin" | "manager" | "staff" | "delivery") => {
    try {
      const res = await api.patch("/api/users", { id: userId, role: newRole });
      
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(res.error || "Ошибка при обновлении роли");
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  };

  const handleSectionToggle = async (userId: number, sectionId: number, currentSections: Section[]) => {
    const isCurrentlyAssigned = currentSections.some(s => s.id === sectionId);
    
    try {
      let res;
      if (isCurrentlyAssigned) {
        res = await api.delete(`/api/user-sections?user_id=${userId}&section_id=${sectionId}`);
      } else {
        res = await api.post("/api/user-sections", {
          user_id: userId,
          section_ids: [sectionId],
        });
      }
      
      if (res.success) {
        setUsers(prev => prev.map(u => {
          if (u.id !== userId) return u;
          const newSections = isCurrentlyAssigned
            ? (u.assigned_sections || []).filter(s => s.id !== sectionId)
            : [...(u.assigned_sections || []), { ...sections.find(s => s.id === sectionId)!, can_send_orders: true, can_receive_supplies: true }];
          return { ...u, assigned_sections: newSections };
        }));
      } else {
        alert(res.error || "Ошибка при обновлении отделов");
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  };

  const handlePermissionChange = async (userId: number, field: "can_send_orders" | "can_receive_supplies", value: boolean) => {
    // Optimistic UI update
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      return { ...u, [field]: value };
    }));

    try {
      const res = await api.patch("/api/users", {
        id: userId,
        [field]: value
      });

      if (!res.success) {
        alert(res.error || "Ошибка при обновлении прав");
        fetchUsers(); // Revert on failure
      }
    } catch (err) {
      alert("Ошибка сети");
      fetchUsers(); // Revert on failure
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${userName}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/users?id=${userId}`);

      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        alert(res.error || "Ошибка при удалении");
      }
    } catch (err) {
      alert("Ошибка сети");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PageHeader 
        title="Команда" 
        backHref="/"
        rightContent={
          <button 
            onClick={() => {
              setInviteUrl("");
              setIsInviteModalOpen(true);
            }}
            className="text-brand-500 hover:text-brand-600 font-medium"
          >
            + Пригласить
          </button>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {users.map((user) => (
          <Card key={user.id} className="p-5 flex flex-col gap-5 bg-white border-0 shadow-sm">
            {/* Header: Role, Name, Email & Delete */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded w-fit mb-1">
                  {ALL_ROLES.find(r => r.id === user.role)?.label || user.role}
                </span>
                <h3 className="font-bold text-gray-900 text-lg flex items-center">
                  {user.name}
                  {!user.is_active && <span className="ml-2 text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Удален</span>}
                </h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              
              {user.is_active && user.id !== parseInt(session?.user?.id || "0") && (
                <button
                  onClick={() => handleDelete(user.id, user.name)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Удалить пользователя"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Global Permissions - Only for staff/delivery since admin/manager have it by default */}
            {!["admin", "manager"].includes(user.role) && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block">Может</span>
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200">
                    <span className="font-medium text-gray-900 text-sm">Отправлять заказы</span>
                    <Toggle 
                      checked={user.can_send_orders ?? false}
                      onChange={(checked) => handlePermissionChange(user.id, "can_send_orders", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200">
                    <span className="font-medium text-gray-900 text-sm">Принимать поставки</span>
                    <Toggle 
                      checked={user.can_receive_supplies ?? false}
                      onChange={(checked) => handlePermissionChange(user.id, "can_receive_supplies", checked)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Department Multi-select (Checkboxes) */}
            {["staff", "delivery"].includes(user.role) && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Доступ к отделам</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {sections.map((section) => {
                    const isAssigned = (user.assigned_sections || []).some(s => s.id === section.id);
                    return (
                      <div 
                        key={section.id} 
                        className={`flex flex-col p-3 rounded-xl border transition-colors ${
                          isAssigned 
                            ? "bg-brand-50 border-brand-200" 
                            : "bg-white border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleSectionToggle(user.id, section.id, user.assigned_sections || [])}
                            className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{section.emoji}</span>
                            <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        ))}
      </main>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Пригласить в команду"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Сгенерируйте ссылку для быстрой регистрации нового сотрудника.
          </p>
          
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Роль</span>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setInviteRole(r.id)}
                  disabled={inviteLoading || !!inviteUrl}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    inviteRole === r.id
                      ? "bg-brand-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${(inviteLoading || !!inviteUrl) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {["admin", "manager"].includes(inviteRole) && (
              <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
                ⚠️ Получит доступ ко всем отделам
              </p>
            )}
          </div>

          {["staff", "delivery"].includes(inviteRole) && (
            <>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Может</span>
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200">
                    <span className="font-medium text-gray-900 text-sm">Отправлять заказы</span>
                    <Toggle 
                      disabled={!!inviteUrl}
                      checked={inviteCanSend}
                      onChange={setInviteCanSend}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200">
                    <span className="font-medium text-gray-900 text-sm">Принимать поставки</span>
                    <Toggle 
                      disabled={!!inviteUrl}
                      checked={inviteCanReceive}
                      onChange={setInviteCanReceive}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Доступ к отделам</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sections.map((section) => {
                    const isAssigned = inviteSections.includes(section.id);
                    return (
                      <label 
                        key={section.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isAssigned 
                            ? "bg-brand-50 border-brand-200" 
                            : "bg-white border-gray-200 hover:bg-gray-100"
                        } ${inviteUrl ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <input
                          type="checkbox"
                          disabled={!!inviteUrl}
                          checked={isAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteSections(prev => [...prev, section.id]);
                            } else {
                              setInviteSections(prev => prev.filter(id => id !== section.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{section.emoji}</span>
                          <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {inviteUrl ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
              <p className="text-sm text-green-800 font-medium mb-3">Ссылка успешно создана!</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="w-full bg-white border border-green-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    alert("Ссылка скопирована!");
                  }}
                  variant="primary"
                >
                  Копировать
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button 
                onClick={handleGenerateInvite} 
                isLoading={inviteLoading}
                className="w-full py-3"
              >
                Сгенерировать ссылку
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
