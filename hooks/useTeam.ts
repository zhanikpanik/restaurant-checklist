"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { clientCache, fetchWithCache } from "@/lib/client-cache";

// ── Types ──────────────────────────────────────────────────
export interface TeamUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff" | "delivery";
  is_active: boolean;
  last_login?: string;
  can_send_orders?: boolean;
  can_receive_supplies?: boolean;
  assigned_sections?: TeamSection[];
}

export interface TeamSection {
  id: number;
  name: string;
  emoji: string;
}

export const ALL_ROLES = [
  { id: "staff", label: "Персонал" },
  { id: "manager", label: "Менеджер" },
  { id: "admin", label: "Админ" },
  { id: "delivery", label: "Доставка" },
] as const;

export const ASSIGNABLE_ROLES = [
  { id: "staff", label: "Персонал" },
  { id: "manager", label: "Менеджер" },
] as const;

// ── Hook ───────────────────────────────────────────────────
export function useTeam() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<TeamUser[]>(
    () => clientCache.get("team_users") || []
  );
  const [sections, setSections] = useState<TeamSection[]>(
    () => clientCache.get("team_sections") || []
  );
  const [loading, setLoading] = useState(!clientCache.has("team_users"));

  // ── Invite modal ──────────────────────────────────
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<
    "admin" | "manager" | "staff" | "delivery"
  >("staff");
  const [inviteSections, setInviteSections] = useState<number[]>([]);
  const [inviteCanSend, setInviteCanSend] = useState(false);
  const [inviteCanReceive, setInviteCanReceive] = useState(false);
  const [error, setError] = useState("");

  // ── Auth guard ────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (!["admin", "manager"].includes(session.user.role)) {
        router.push("/");
        return;
      }
      Promise.all([fetchUsers(), fetchSections()]).finally(() =>
        setLoading(false)
      );
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      // Use include_sections=true to avoid N+1 API calls — server joins in one query
      const data = await fetchWithCache("/api/users?include_sections=true");
      if (data?.success) {
        setUsers(data.data);
        clientCache.set("team_users", data.data);
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

  // ── Invite ────────────────────────────────────────
  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setError("");

    // Validation before API call
    if (sections.length === 0) {
      setError("Сначала синхронизируйте хотя бы один отдел из Poster.");
      setInviteLoading(false);
      return;
    }

    const isManagerOrAdmin = ["admin", "manager"].includes(inviteRole);
    const sectionsToAssign = isManagerOrAdmin
      ? sections.map((s) => s.id)
      : inviteSections;

    if (!isManagerOrAdmin && sectionsToAssign.length === 0) {
      setError("Выберите хотя бы один отдел");
      setInviteLoading(false);
      return;
    }

    try {
      const res = await api.post<{ url: string }>("/api/invitations", {
        role: inviteRole,
        can_send_orders: inviteCanSend,
        can_receive_supplies: inviteCanReceive,
        sections: sectionsToAssign.map((id) => ({
          section_id: id,
          can_send_orders: true,
          can_receive_supplies: true,
        })),
        expires_in_days: 7,
      });

      if (res.success && res.data) {
        setInviteUrl(res.data.url);
      } else {
        setError(res.error || "Ошибка генерации ссылки");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setInviteLoading(false);
    }
  };

  const openInviteModal = () => {
    setInviteUrl("");
    setError("");
    setIsInviteModalOpen(true);
  };

  // ── Role change ───────────────────────────────────
  const handleRoleChange = async (
    userId: number,
    newRole: "admin" | "manager" | "staff" | "delivery"
  ) => {
    try {
      const res = await api.patch("/api/users", {
        id: userId,
        role: newRole,
      });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        alert(res.error || "Ошибка при обновлении роли");
      }
    } catch {
      alert("Ошибка сети");
    }
  };

  // ── Section toggle ────────────────────────────────
  const handleSectionToggle = async (
    userId: number,
    sectionId: number,
    currentSections: TeamSection[]
  ) => {
    const isCurrentlyAssigned = currentSections.some(
      (s) => s.id === sectionId
    );
    try {
      const res = isCurrentlyAssigned
        ? await api.delete(
            `/api/user-sections?user_id=${userId}&section_id=${sectionId}`
          )
        : await api.post("/api/user-sections", {
            user_id: userId,
            section_ids: [sectionId],
          });

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            const newSections = isCurrentlyAssigned
              ? (u.assigned_sections || []).filter(
                  (s) => s.id !== sectionId
                )
              : [
                  ...(u.assigned_sections || []),
                  sections.find((s) => s.id === sectionId)!,
                ];
            return { ...u, assigned_sections: newSections };
          })
        );
      } else {
        alert(res.error || "Ошибка при обновлении отделов");
      }
    } catch {
      alert("Ошибка сети");
    }
  };

  // ── Permission change ─────────────────────────────
  const handlePermissionChange = async (
    userId: number,
    field: "can_send_orders" | "can_receive_supplies",
    value: boolean
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.id !== userId ? u : { ...u, [field]: value }))
    );
    try {
      const res = await api.patch("/api/users", {
        id: userId,
        [field]: value,
      });
      if (!res.success) {
        alert(res.error || "Ошибка при обновлении прав");
        fetchUsers();
      }
    } catch {
      alert("Ошибка сети");
      fetchUsers();
    }
  };

  // ── Delete user ───────────────────────────────────
  const handleDelete = async (userId: number, userName: string) => {
    if (
      !confirm(
        `Вы уверены, что хотите удалить пользователя ${userName}? Это действие нельзя отменить.`
      )
    )
      return;
    try {
      const res = await api.delete(`/api/users?id=${userId}`);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        alert(res.error || "Ошибка при удалении");
      }
    } catch {
      alert("Ошибка сети");
    }
  };

  return {
    session,
    status,
    users,
    sections,
    loading,
    isInviteModalOpen,
    setIsInviteModalOpen,
    openInviteModal,
    inviteUrl,
    inviteLoading,
    inviteRole,
    setInviteRole,
    inviteSections,
    setInviteSections,
    inviteCanSend,
    setInviteCanSend,
    inviteCanReceive,
    setInviteCanReceive,
    error,
    setError,
    handleGenerateInvite,
    handleRoleChange,
    handleSectionToggle,
    handlePermissionChange,
    handleDelete,
    fetchUsers,
  };
}
