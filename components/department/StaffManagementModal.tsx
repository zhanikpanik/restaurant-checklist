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
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  delivery: "Delivery",
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
  
  // Invitation form state (simplified - only permissions)
  const [inviteData, setInviteData] = useState({
    can_send_orders: false,
    can_receive_supplies: false,
  });
  
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
      
      console.log("📥 Loaded assigned users from server:", JSON.stringify(data, null, 2));
      
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
    // Calculate new values - simple toggle, no dependencies
    const newValue = !currentValue;

    // Get current user to preserve all their current permissions
    const currentUser = assignedUsers.find(u => u.id === userId);
    if (!currentUser) return;

    // Optimistic update - update UI immediately
    const previousUsers = [...assignedUsers];
    setAssignedUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, [permission]: newValue }
        : u
    ));

    try {
      // Get current user's sections
      const userSectionsRes = await fetch(`/api/user-sections?user_id=${userId}`);
      const userSectionsData = await userSectionsRes.json();
      
      console.log("🔍 Fetched user sections:", userSectionsData);
      
      if (!userSectionsData.success) {
        toast.error("Error loading data");
        // Revert on error
        setAssignedUsers(previousUsers);
        return;
      }

      // Check if this section already exists in user's sections
      const existingSectionIds = userSectionsData.data?.map((s: any) => s.id) || [];
      console.log("📋 Existing section IDs:", existingSectionIds);
      console.log("🎯 Current section ID:", section?.id);

      // Update permissions for this specific section
      const updatedSections = userSectionsData.data.map((s: any) => {
        if (s.id === section?.id) {
          // Use the current local state + the new value
          return {
            section_id: s.id,
            can_send_orders: permission === "can_send_orders" ? newValue : (currentUser.can_send_orders || false),
            can_receive_supplies: permission === "can_receive_supplies" ? newValue : (currentUser.can_receive_supplies || false),
          };
        }
        return {
          section_id: s.id,
          can_send_orders: s.can_send_orders || false,
          can_receive_supplies: s.can_receive_supplies || false,
        };
      });

      // If section doesn't exist in user's sections, add it
      if (!existingSectionIds.includes(section?.id)) {
        console.log("➕ Adding new section to user");
        updatedSections.push({
          section_id: section?.id,
          can_send_orders: permission === "can_send_orders" ? newValue : false,
          can_receive_supplies: permission === "can_receive_supplies" ? newValue : false,
        });
      }

      console.log("📤 Sending to server:", JSON.stringify({ user_id: userId, sections: updatedSections }, null, 2));
      
      const res = await api.post("/api/user-sections", {
        user_id: userId,
        sections: updatedSections,
      });

      console.log("📥 Server response:", res);

      if (!res.success) {
        toast.error(res.error || "Update failed");
        console.error("Server error:", res);
        // Revert on error
        setAssignedUsers(previousUsers);
      } else {
        console.log("✅ Permission updated successfully:", { userId, permission, newValue });
      }
    } catch (error) {
      console.error("Error toggling permission:", error);
      toast.error("Network error");
      // Revert on error
      setAssignedUsers(previousUsers);
    }
  };

  const handleRemoveUser = async (userId: number, userName: string) => {
    if (!confirm(`Remove ${userName} from "${section?.name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/user-sections?user_id=${userId}&section_id=${section?.id}`);
      
      if (res.success) {
        toast.success("User removed from department");
        await loadAssignedUsers();
        await loadAllUsers(); // Refresh the available users list
        onUpdate();
      } else {
        toast.error(res.error || "Delete failed");
      }
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Network error");
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`⚠️ Delete account "${userName}"?\n\nThis will permanently deactivate their account and remove them from all departments.`)) {
      return;
    }

    setDeleteMenuUserId(null); // Close menu
    
    try {
      const res = await api.delete(`/api/users?id=${userId}`);
      
      if (res.success) {
        toast.success("User account deleted");
        loadAssignedUsers();
        loadAllUsers();
        onUpdate();
      } else {
        toast.error(res.error || "Delete failed");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Network error");
    }
  };

  const handleCreateInvitation = async () => {
    setSubmitting(true);

    try {
      const res = await api.post("/api/invitations", {
        name: null,
        email: null,
        role: "staff",
        sections: [
          {
            section_id: section?.id,
            can_send_orders: inviteData.can_send_orders,
            can_receive_supplies: inviteData.can_receive_supplies,
          },
        ],
        expires_in_days: 7,
      });

      const data = res as any; 

      if (data.success) {
        setInvitationUrl(data.data.url);
        setShowInviteSuccess(true);
        setInviteData({
          can_send_orders: false,
          can_receive_supplies: false,
        });
      } else {
        toast.error(data.error || "Failed to create invitation");
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignExistingDirectly = async (userId: number) => {
    setSubmitting(true);
    try {
      const userSectionsRes = await fetch(`/api/user-sections?user_id=${userId}`);
      const userSectionsData = await userSectionsRes.json();
      
      const currentSectionIds = userSectionsData.success 
        ? userSectionsData.data.map((s: any) => ({
            section_id: s.id,
            can_send_orders: s.can_send_orders,
            can_receive_supplies: s.can_receive_supplies,
          }))
        : [];

      const updatedSections = [
        ...currentSectionIds,
        {
          section_id: section?.id,
          can_send_orders: false,
          can_receive_supplies: false,
        },
      ];

      const res = await api.post("/api/user-sections", {
        user_id: userId,
        sections: updatedSections,
      });

      if (res.success) {
        toast.success("User assigned");
        await loadAssignedUsers();
        await loadAllUsers(); // Refresh the available users list
        onUpdate();
      } else {
        toast.error(res.error || "Assignment failed");
      }
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Network error");
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
    const text = `Invitation to ${session?.user?.restaurantName || "restaurant"}\n${invitationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = `Invitation to ${session?.user?.restaurantName || "restaurant"}`;
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
        title="✅ Invitation Created!"
      >
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Share this link with the new staff member
          </p>

          {/* Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Link:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={invitationUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="space-y-2 mb-6">
            <button
              onClick={shareViaWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Send via WhatsApp
            </button>

            <button
              onClick={shareViaTelegram}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.03-2.76-.918c-.6-.183-.612-.6.125-.89l10.782-4.156c.5-.183.943.112.78.89z" />
              </svg>
              Send via Telegram
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowInviteSuccess(false)}
              className="flex-1"
            >
              Create Another
            </Button>
            <Button
              onClick={() => {
                setShowInviteSuccess(false);
                onClose();
              }}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Staff - ${section.emoji} ${section.name}`}
      size="lg"
    >
      {/* Scrollable content area */}
      <div className="flex flex-col max-h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          {/* 1. Assigned Users List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center justify-between">
              <span>Current Team</span>
              {assignedUsers.length > 0 && (
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {assignedUsers.length}
                </span>
              )}
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : assignedUsers.length > 0 ? (
              <div className="space-y-2">
                {assignedUsers.map((user) => (
                  <div key={user.id} className="relative group border border-gray-200 rounded-lg p-3 hover:border-blue-200 transition-colors bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
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
                          title="More options"
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
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove from dept
                            </button>
                            <div className="border-t border-gray-100" />
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete account
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permission toggles - vertical list */}
                    <div className="space-y-2 pl-11 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Create Orders</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(user.id, "can_send_orders", user.can_send_orders || false)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            user.can_send_orders ? "bg-blue-600" : "bg-gray-300"
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
                        <span className="text-xs text-gray-600">Receive Deliveries</span>
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
                <p className="text-sm text-gray-500">No staff in this department yet.</p>
              </div>
            )}
          </div>

          {/* 2. Available Users List (Add Existing) */}
          {unassignedUsers.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h3 className="font-semibold text-gray-900 text-sm">Available to Add</h3>
              <div className="space-y-2">
                {unassignedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[u.role]}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignExistingDirectly(u.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      <span>+ Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Invite New Staff - Simple button only */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="font-semibold text-gray-900 text-sm">Invite New Staff</h3>
            <p className="text-xs text-gray-500">Generate a registration link for new employees. You can set their permissions after they join.</p>
          </div>
        </div>

        {/* Sticky Footer with Action Button */}
        <div className="border-t pt-4 mt-4 bg-white">
          <Button 
            onClick={handleCreateInvitation} 
            disabled={submitting} 
            className="w-full justify-center py-3 text-base"
          >
            {submitting ? "Generating..." : "🔗 Generate Invite Link"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
