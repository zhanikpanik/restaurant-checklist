export type UserRole = "admin" | "manager" | "staff" | "delivery";

/**
 * Role-based permissions system
 * 
 * Defines what each role can access/do in the application
 */

export interface Permission {
  // Navigation
  canAccessManager: boolean;
  canAccessAdmin: boolean;
  canAccessDelivery: boolean;
  
  // Orders
  canViewOrders: boolean;
  canCreateOrders: boolean;
  canEditOrders: boolean;
  canDeleteOrders: boolean;
  canMarkDelivered: boolean;
  
  // Products & Inventory
  canViewProducts: boolean;
  canEditProducts: boolean;
  canViewLeftovers: boolean;
  canEditLeftovers: boolean;
  
  // Settings
  canManageUsers: boolean;
  canManageSuppliers: boolean;
  canManageCategories: boolean;
  canManageSections: boolean;
  
  // Restaurant
  canManageRestaurant: boolean;
}

/**
 * Permission definitions by role
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    // Full access
    canAccessManager: true,
    canAccessAdmin: true,
    canAccessDelivery: true,
    
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: true,
    canDeleteOrders: true,
    canMarkDelivered: true,
    
    canViewProducts: true,
    canEditProducts: true,
    canViewLeftovers: true,
    canEditLeftovers: true,
    
    canManageUsers: true,
    canManageSuppliers: true,
    canManageCategories: true,
    canManageSections: true,
    
    canManageRestaurant: true,
  },
  
  manager: {
    // Can manage operations, but not users/restaurant settings
    canAccessManager: true,
    canAccessAdmin: false,
    canAccessDelivery: true,
    
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: true,
    canDeleteOrders: true,
    canMarkDelivered: true,
    
    canViewProducts: true,
    canEditProducts: true,
    canViewLeftovers: true,
    canEditLeftovers: true,
    
    canManageUsers: true,
    canManageSuppliers: true,
    canManageCategories: true,
    canManageSections: true,
    
    canManageRestaurant: false,
  },
  
  staff: {
    // Can create orders and view inventory
    canAccessManager: false,
    canAccessAdmin: false,
    canAccessDelivery: false,
    
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: false,
    canDeleteOrders: false,
    canMarkDelivered: false,
    
    canViewProducts: true,
    canEditProducts: false,
    canViewLeftovers: true,
    canEditLeftovers: true,
    
    canManageUsers: false,
    canManageSuppliers: false,
    canManageCategories: false,
    canManageSections: false,
    
    canManageRestaurant: false,
  },
  
  delivery: {
    // Can only mark orders as delivered
    canAccessManager: false,
    canAccessAdmin: false,
    canAccessDelivery: true,
    
    canViewOrders: true,
    canCreateOrders: false,
    canEditOrders: false,
    canDeleteOrders: false,
    canMarkDelivered: true,
    
    canViewProducts: false,
    canEditProducts: false,
    canViewLeftovers: false,
    canEditLeftovers: false,
    
    canManageUsers: false,
    canManageSuppliers: false,
    canManageCategories: false,
    canManageSections: false,
    
    canManageRestaurant: false,
  },
};

/**
 * Get permissions for a role
 */
export function getPermissions(role: UserRole | undefined): Permission {
  if (!role) {
    // Return no permissions if no role
    return {
      canAccessManager: false,
      canAccessAdmin: false,
      canAccessDelivery: false,
      canViewOrders: false,
      canCreateOrders: false,
      canEditOrders: false,
      canDeleteOrders: false,
      canMarkDelivered: false,
      canViewProducts: false,
      canEditProducts: false,
      canViewLeftovers: false,
      canEditLeftovers: false,
      canManageUsers: false,
      canManageSuppliers: false,
      canManageCategories: false,
      canManageSections: false,
      canManageRestaurant: false,
    };
  }
  
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole | undefined,
  permission: keyof Permission
): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

/**
 * Get role label in Russian
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Администратор",
    manager: "Менеджер",
    staff: "Персонал",
    delivery: "Доставка",
  };
  return labels[role];
}
