// Restaurant & Authentication Types
export interface Restaurant {
  id: string;
  name: string;
  logo?: string;
  primary_color?: string;
  currency?: string;
  poster_account_name?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

// Section Types
export interface Section {
  id: number;
  tenant_id?: string;
  restaurant_id?: string;
  name: string;
  emoji: string;
  poster_storage_id?: number;
  custom_products_count?: number;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Product Types
export interface Product {
  id: number;
  restaurant_id: string;
  name: string;
  category_id?: number;
  category_name?: string;
  section_name?: string;
  supplier_id?: number;
  poster_id?: string;
  unit?: string;
  department?: string;
  quantity?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CustomProduct {
  id: number;
  name: string;
  unit: string;
  category_id?: number;
  department_id?: number;
  restaurant_id?: string;
  min_quantity: number;
  current_quantity: number;
  is_active: boolean;
}

export interface SectionProduct {
  id: number;
  section_id: number;
  poster_ingredient_id: string;
  name: string;
  unit?: string;
  category_id?: number;
  quantity?: number;
  is_active: boolean;
}

// Category & Supplier Types
export interface ProductCategory {
  id: number;
  restaurant_id: string;
  name: string;
  supplier_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Supplier {
  id: number;
  restaurant_id: string;
  name: string;
  phone?: string;
  contact_info?: string;
  poster_supplier_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

// Order Types
export interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  supplier?: string;
  supplier_id?: number | string;
  poster_id?: string;
  productId?: number;
}

export interface Order {
  id: number;
  restaurant_id: string;
  order_data: {
    items: OrderItem[];
    department?: string;
    notes?: string;
    total_items?: number;
  };
  status: 'pending' | 'sent' | 'delivered' | 'cancelled';
  created_by_role?: string;
  created_at: Date;
  sent_at?: Date;
  delivered_at?: Date;
}

// Cart Types
export interface CartItem extends OrderItem {
  cartId: string;
}

export interface CartState {
  items: CartItem[];
  department?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Poster API Types
export interface PosterToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
}

export interface PosterStorage {
  storage_id: number;
  storage_name: string;
  department_id?: number;
}

export interface PosterIngredient {
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit?: string;
  ingredient_category_id?: number;
  type?: string;
}

export interface PosterSupplier {
  supplier_id: number;
  supplier_name: string;
  supplier_phone?: string;
  supplier_address?: string;
}

// User Section Permissions
export interface UserSectionPermission {
  user_id: number;
  section_id: number;
  section_name?: string;
  can_send_orders: boolean;
  can_receive_supplies: boolean;
}

// User permissions summary (for current user across all their sections)
export interface UserOrderPermissions {
  canSendOrders: boolean;      // Can send orders via WhatsApp (any section)
  canReceiveSupplies: boolean; // Can confirm delivery and adjust (any section)
  sectionPermissions: UserSectionPermission[]; // Detailed per-section permissions
}