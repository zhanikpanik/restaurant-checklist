"use client";

import { useSession } from "next-auth/react";
import { getPermissions, hasPermission, Permission } from "@/lib/permissions";
import { UserRole } from "@/lib/auth-config";

/**
 * Hook to get current user's permissions
 * 
 * @example
 * ```tsx
 * const { permissions, can, role, isAdmin, isLoading } = usePermissions();
 * 
 * if (can("canManageUsers")) {
 *   // Show user management button
 * }
 * ```
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  
  const role = session?.user?.role as UserRole | undefined;
  const permissions = getPermissions(role);
  
  const can = (permission: keyof Permission): boolean => {
    return hasPermission(role, permission);
  };
  
  return {
    // Session state
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    
    // User info
    role,
    userId: session?.user?.id,
    userName: session?.user?.name,
    userEmail: session?.user?.email,
    restaurantId: session?.user?.restaurantId,
    restaurantName: session?.user?.restaurantName,
    
    // Permissions
    permissions,
    can,
    
    // Convenience checks
    isAdmin: role === "admin",
    isManager: role === "manager",
    isStaff: role === "staff",
    isDelivery: role === "delivery",
  };
}
