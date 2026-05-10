"use client";

import { useAuthStore } from "@/store/authStore";

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions.includes(permission);
}

export function useRole(): 'admin' | 'staff' | null {
  return useAuthStore((s) => s.role);
}

export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.role === 'admin');
}
