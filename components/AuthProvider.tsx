"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { getBusinessMembership, ADMIN_PERMISSIONS, STAFF_PERMISSIONS } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login", "/invite", "/auth"];
const ONBOARDING_PREFIX = "/onboarding";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, clearSession, isAuthenticated, hasCompletedOnboarding } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  // Prevent concurrent hydrateSession calls
  const hydrating = useRef(false);

  useEffect(() => {
    // ── No Supabase (demo mode) ──────────────────────────────
    if (!supabase) {
      setReady(true);
      return;
    }

    // ── Use onAuthStateChange as the SINGLE source of truth ──
    // It fires with INITIAL_SESSION first (replaces getSession()),
    // then again on any login/logout/token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (hydrating.current) return;
        hydrating.current = true;

        try {
          if (session?.user) {
            await hydrateUser(session.user);
          } else {
            clearSession();
          }
        } catch {
          // Never leave the app stuck — always mark ready
          clearSession();
        } finally {
          hydrating.current = false;
          setReady(true); // ← always unblocks the UI
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Route guarding ────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX);
    const isDashboard = pathname.startsWith("/dashboard");

    if (!isAuthenticated && !isPublic && !isOnboarding) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && pathname === "/login") {
      router.replace(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
      return;
    }
    if (isAuthenticated && isDashboard && !hasCompletedOnboarding) {
      router.replace("/onboarding");
      return;
    }
    if (isAuthenticated && isOnboarding && hasCompletedOnboarding) {
      router.replace("/dashboard");
      return;
    }
  }, [ready, isAuthenticated, hasCompletedOnboarding, pathname, router]);

  // ── Loading splash ────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)]">
            <span className="font-bold text-primary-foreground text-2xl">B</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Block unauthenticated access to protected routes (SSR-safe)
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX);
  if (!isAuthenticated && !isPublic && !isOnboarding) {
    return null;
  }

  return <>{children}</>;
}

// ── Helper ─────────────────────────────────────────────────
async function hydrateUser(supabaseUser: User) {
  const membership = await getBusinessMembership(supabaseUser.id);
  const role = (membership?.role ?? null) as "admin" | "staff" | null;
  const permissions =
    role === "admin"
      ? ADMIN_PERMISSIONS
      : role === "staff"
      ? [...STAFF_PERMISSIONS, ...(membership?.permissions ?? [])]
      : [];

  useAuthStore.getState().setSession(
    {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      name: supabaseUser.user_metadata?.full_name as string | undefined,
      avatar_url: supabaseUser.user_metadata?.avatar_url as string | undefined,
    },
    membership?.business_id ?? null,
    membership?.businesses?.name ?? null,
    role,
    permissions,
    !!membership?.business_id,
  );
}
