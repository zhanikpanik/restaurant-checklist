"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useTeam, ALL_ROLES, ASSIGNABLE_ROLES } from "@/hooks/useTeam";
import type { TeamUser, TeamSection } from "@/hooks/useTeam";

// ── User Card ───────────────────────────────────────────────
function UserCard({
  user,
  sections,
  sessionUserId,
  onRoleChange,
  onSectionToggle,
  onPermissionChange,
  onDelete,
}: {
  user: TeamUser;
  sections: TeamSection[];
  sessionUserId: number;
  onRoleChange: (
    userId: number,
    role: "admin" | "manager" | "staff" | "delivery"
  ) => void;
  onSectionToggle: (
    userId: number,
    sectionId: number,
    currentSections: TeamSection[]
  ) => void;
  onPermissionChange: (
    userId: number,
    field: "can_send_orders" | "can_receive_supplies",
    value: boolean
  ) => void;
  onDelete: (userId: number, userName: string) => void;
}) {
  const isSelf = user.id === sessionUserId;
  const showPermissions = !["admin", "manager"].includes(user.role);
  const showSections = ["staff", "delivery"].includes(user.role);

  return (
    <Card className="p-5 flex flex-col gap-5 bg-white border-0 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded w-fit mb-1">
            {ALL_ROLES.find((r) => r.id === user.role)?.label || user.role}
          </span>
          <h3 className="font-bold text-gray-900 text-lg flex items-center">
            {user.name}
            {!user.is_active && (
              <span className="ml-2 text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                Удален
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        {user.is_active && !isSelf && (
          <button
            onClick={() => onDelete(user.id, user.name)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Удалить пользователя"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Permissions */}
      {showPermissions && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 block">
            Может
          </span>
          <div className="flex flex-col gap-3 mt-1">
            <PermissionRow
              label="Отправлять заказы"
              checked={user.can_send_orders ?? false}
              onChange={(v) =>
                onPermissionChange(user.id, "can_send_orders", v)
              }
            />
            <PermissionRow
              label="Принимать поставки"
              checked={user.can_receive_supplies ?? false}
              onChange={(v) =>
                onPermissionChange(user.id, "can_receive_supplies", v)
              }
            />
          </div>
        </div>
      )}

      {/* Section access */}
      {showSections && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Доступ к отделам
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {sections.map((section) => {
              const isAssigned = (user.assigned_sections || []).some(
                (s) => s.id === section.id
              );
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
                      onChange={() =>
                        onSectionToggle(
                          user.id,
                          section.id,
                          user.assigned_sections || []
                        )
                      }
                      className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{section.emoji}</span>
                      <span className="font-medium text-gray-900 text-sm">
                        {section.name}
                      </span>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function PermissionRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200">
      <span className="font-medium text-gray-900 text-sm">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Invite Modal ────────────────────────────────────────────
function InviteModal({
  isOpen,
  onClose,
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
  sections,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  inviteLoading: boolean;
  inviteRole: string;
  setInviteRole: (role: any) => void;
  inviteSections: number[];
  setInviteSections: (updater: any) => void;
  inviteCanSend: boolean;
  setInviteCanSend: (v: boolean) => void;
  inviteCanReceive: boolean;
  setInviteCanReceive: (v: boolean) => void;
  error: string;
  sections: any[];
  onGenerate: () => void;
}) {

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Пригласить в команду"
      size="sm"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Сгенерируйте ссылку для быстрой регистрации нового сотрудника.
        </p>

        {/* Role selector */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Роль
          </span>
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
                } ${inviteLoading || inviteUrl ? "opacity-50 cursor-not-allowed" : ""}`}
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

        {/* Permissions + sections for staff/delivery */}
        {["staff", "delivery"].includes(inviteRole) && (
          <>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Может
              </span>
              <PermissionRow
                label="Отправлять заказы"
                checked={inviteCanSend}
                onChange={setInviteCanSend}
              />
              <PermissionRow
                label="Принимать поставки"
                checked={inviteCanReceive}
                onChange={setInviteCanReceive}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Доступ к отделам
              </span>
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
                            setInviteSections((prev: number[]) => [
                              ...prev,
                              section.id,
                            ]);
                          } else {
                            setInviteSections((prev: number[]) =>
                              prev.filter((id: number) => id !== section.id)
                            );
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{section.emoji}</span>
                        <span className="font-medium text-gray-900 text-sm">
                          {section.name}
                        </span>
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
            <p className="text-sm text-green-800 font-medium mb-3">
              Ссылка успешно создана!
            </p>
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
              onClick={onGenerate}
              isLoading={inviteLoading}
              className="w-full py-3"
            >
              Сгенерировать ссылку
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function TeamPage() {
  const {
    session,
    status,
    users,
    sections,
    loading,
    openInviteModal,
    handleRoleChange,
    handleSectionToggle,
    handlePermissionChange,
    handleDelete,
    isInviteModalOpen,
    setIsInviteModalOpen,
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
    error: inviteError,
    handleGenerateInvite,
  } = useTeam();

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
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
            onClick={openInviteModal}
            className="text-brand-500 hover:text-brand-600 font-medium"
          >
            + Пригласить
          </button>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            sections={sections}
            sessionUserId={parseInt(session?.user?.id || "0")}
            onRoleChange={handleRoleChange}
            onSectionToggle={handleSectionToggle}
            onPermissionChange={handlePermissionChange}
            onDelete={handleDelete}
          />
        ))}
      </main>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        inviteUrl={inviteUrl}
        inviteLoading={inviteLoading}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        inviteSections={inviteSections}
        setInviteSections={setInviteSections}
        inviteCanSend={inviteCanSend}
        setInviteCanSend={setInviteCanSend}
        inviteCanReceive={inviteCanReceive}
        setInviteCanReceive={setInviteCanReceive}
        error={inviteError}
        sections={sections}
        onGenerate={handleGenerateInvite}
      />
    </div>
  );
}
