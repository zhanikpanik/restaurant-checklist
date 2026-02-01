import { z } from "zod";
import type { ZodError, ZodIssue } from "zod";

// ============================================
// Common Schemas
// ============================================

export const idParamSchema = z.coerce.number().int().positive("ID must be a positive integer");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// ============================================
// User Schemas
// ============================================

export const userRoleSchema = z.enum(["admin", "manager", "staff", "delivery"]);

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  name: z.string().min(1, "Name is required").max(100),
  role: userRoleSchema.optional().default("staff"),
});

export const updateUserSchema = z.object({
  id: idParamSchema,
  email: z.string().email("Invalid email address").max(255).optional(),
  name: z.string().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

// ============================================
// Section Schemas
// ============================================

export const createSectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  emoji: z.string().max(4).optional().default("📦"),
  poster_storage_id: z.number().int().positive().nullable().optional(),
});

export const updateSectionSchema = z.object({
  id: idParamSchema,
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(4).optional(),
  poster_storage_id: z.number().int().positive().nullable().optional(),
});

// ============================================
// Category Schemas
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  supplier_id: z.number().int().positive().nullable().optional(),
});

export const updateCategorySchema = z.object({
  id: idParamSchema,
  name: z.string().min(1).max(100).optional(),
  supplier_id: z.number().int().positive().nullable().optional(),
});

// ============================================
// Supplier Schemas
// ============================================

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(50).optional().default(""),
  contact_info: z.string().max(500).optional().default(""),
});

export const updateSupplierSchema = z.object({
  id: idParamSchema,
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  contact_info: z.string().max(500).optional(),
});

// ============================================
// Product Schemas
// ============================================

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  unit: z.string().max(20).optional().default(""),
  section_id: z.number().int().positive("Section is required"),
  category_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  id: idParamSchema,
  name: z.string().min(1).max(200).optional(),
  unit: z.string().max(20).optional(),
  section_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

// ============================================
// Order Schemas
// ============================================

export const orderItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().max(20).optional().default("шт"),
  category: z.string().max(100).optional(),
  supplier: z.string().max(100).optional(),
  poster_id: z.number().int().nullable().optional(),
  productId: z.number().int().nullable().optional(),
});

export const createOrderSchema = z.object({
  department: z.string().max(100).optional(),
  section_id: z.number().int().positive().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  notes: z.string().max(1000).optional().default(""),
  created_by: z.string().max(100).optional(),
});

export const updateOrderSchema = z.object({
  id: idParamSchema,
  status: z.enum(["pending", "sent", "delivered", "cancelled"]).optional(),
  order_data: z.object({
    department: z.string().max(100).optional(),
    items: z.array(orderItemSchema).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
});

// ============================================
// User Sections Schemas
// ============================================

export const assignUserSectionsSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
  section_ids: z.array(z.number().int().positive()).default([]),
});

// ============================================
// Poster Supply Order Schemas
// ============================================

export const supplyOrderItemSchema = z.object({
  ingredient_id: z.number().int().positive(),
  quantity: z.number().positive(),
  price: z.number().min(0).optional().default(0),
});

export const createSupplyOrderSchema = z.object({
  supplier_id: z.number().int().positive("Supplier ID is required"),
  storage_id: z.number().int().positive().optional().default(1),
  items: z.array(supplyOrderItemSchema).min(1, "At least one item is required"),
  comment: z.string().max(500).optional(),
});

// ============================================
// Utility Functions
// ============================================

/**
 * Validate request body with a Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues.map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`);
      return { success: false, error: errors.join(", ") };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: "Invalid JSON body" };
  }
}

/**
 * Validate URL search params with a Zod schema
 */
export function validateParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.issues.map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`);
    return { success: false, error: errors.join(", ") };
  }
  
  return { success: true, data: result.data };
}

/**
 * Validate a single ID parameter
 */
export function validateId(id: string | null): { success: true; data: number } | { success: false; error: string } {
  if (!id) {
    return { success: false, error: "ID is required" };
  }
  
  const result = idParamSchema.safeParse(id);
  
  if (!result.success) {
    return { success: false, error: "Invalid ID format" };
  }
  
  return { success: true, data: result.data };
}

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AssignUserSectionsInput = z.infer<typeof assignUserSectionsSchema>;
export type CreateSupplyOrderInput = z.infer<typeof createSupplyOrderSchema>;
