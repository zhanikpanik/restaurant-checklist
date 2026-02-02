import { useAuth } from "@/contexts/AuthContext";
import { getPermissions, hasPermission, Permission, UserRole } from "@/lib/permissions";

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
  const { user, isLoading } = useAuth();
  
  const role = user?.role as UserRole | undefined;
  const permissions = getPermissions(role);
  
  const can = (permission: keyof Permission): boolean => {
    return hasPermission(role, permission);
  };
  
  return {
    // Session state
    isLoading,
    isAuthenticated: !!user,
    
    // User info
    role,
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    restaurantId: user?.restaurant_id,
    restaurantName: user?.restaurant_name,
    
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
