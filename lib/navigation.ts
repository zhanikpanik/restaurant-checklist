/**
 * Navigation utilities for role-based routing
 */

import { api } from "./api-client";
import type { UserOrderPermissions } from "@/types";

/**
 * Get the "root" URL for a user based on their role and assigned sections
 * 
 * @param isManager - Whether the user is a manager/admin
 * @param currentSection - The currently selected section (from store)
 * @returns The appropriate back/home URL
 */
export async function getUserRootUrl(
  isManager: boolean,
  currentSection?: { id: number; name: string } | null
): Promise<string> {
  // If we have a current section, use it
  if (currentSection) {
    return `/custom?section_id=${currentSection.id}`;
  }

  // Managers always go to dashboard
  if (isManager) {
    return "/";
  }

  // Staff: Try to fetch their assigned section
  try {
    const permissionsRes = await api.get<UserOrderPermissions>("/api/user-sections?permissions=true");
    if (permissionsRes.success && permissionsRes.data && permissionsRes.data.sectionPermissions.length > 0) {
      const firstSection = permissionsRes.data.sectionPermissions[0];
      return `/custom?section_id=${firstSection.section_id}`;
    }
  } catch (error) {
    console.error("Error fetching user sections:", error);
  }

  // Fallback to dashboard
  return "/";
}

/**
 * Synchronous version - returns the best guess without API calls
 * Use this when you already have the user's sections loaded
 */
export function getUserRootUrlSync(
  isManager: boolean,
  currentSection?: { id: number; name: string } | null,
  userSections?: { id: number; name: string }[]
): string {
  // If we have a current section, use it
  if (currentSection) {
    return `/custom?section_id=${currentSection.id}`;
  }

  // Managers always go to dashboard
  if (isManager) {
    return "/";
  }

  // Staff: Use their first assigned section if available
  if (userSections && userSections.length > 0) {
    return `/custom?section_id=${userSections[0].id}`;
  }

  // Fallback to dashboard
  return "/";
}
