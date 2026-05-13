import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: AuthUser | null;
  businessId: string | null;
  businessName: string | null;
  role: 'admin' | 'staff' | null;
  permissions: string[];
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;

  // Staff mode — locks sensitive UI behind admin PIN
  staffMode: boolean;
  staffModeUnlockUntil: number | null;
  setStaffMode: (on: boolean, unlockUntil?: number | null) => void;

  setSession: (user: AuthUser, businessId: string | null, businessName: string | null, role: 'admin' | 'staff' | null, permissions: string[], hasOnboarded: boolean) => void;
  clearSession: () => void;
  setOnboardingComplete: (businessId: string, businessName: string) => void;
  // Legacy compat
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      businessId: null,
      businessName: null,
      role: null,
      permissions: [],
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      staffMode: true, // ← always locked by default
      staffModeUnlockUntil: null,

      setStaffMode: (on, unlockUntil = null) => set({ staffMode: on, staffModeUnlockUntil: on ? null : unlockUntil }),

      setSession: (user, businessId, businessName, role, permissions, hasOnboarded) =>
        set({
          user,
          businessId,
          businessName,
          role,
          permissions,
          hasCompletedOnboarding: hasOnboarded,
          isAuthenticated: true,
        }),

      clearSession: () =>
        set({
          user: null,
          businessId: null,
          businessName: null,
          role: null,
          permissions: [],
          hasCompletedOnboarding: false,
          isAuthenticated: false,
          staffMode: true, // reset to locked on logout
          staffModeUnlockUntil: null,
        }),

      setOnboardingComplete: (businessId, businessName) =>
        set({ businessId, businessName, hasCompletedOnboarding: true }),

      // Legacy compat
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () =>
        set({
          user: null,
          businessId: null,
          businessName: null,
          role: null,
          permissions: [],
          hasCompletedOnboarding: false,
          isAuthenticated: false,
          staffMode: true, // reset to locked on logout
          staffModeUnlockUntil: null,
        }),
    }),
    { name: 'bill-dale-auth' }
  )
);
