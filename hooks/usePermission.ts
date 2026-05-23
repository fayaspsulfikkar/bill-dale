"use client";

import { useAuthStore } from "@/store/authStore";
import { isAdminLevel, type UserRole } from "@/lib/permissions";

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions.includes(permission);
}

export function useRole(): UserRole | null {
  return useAuthStore((s) => s.role);
}

export function useIsAdmin(): boolean {
  return useAuthStore((s) => isAdminLevel(s.role));
}
