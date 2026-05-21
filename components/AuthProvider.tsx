"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { getBusinessMembership, ADMIN_PERMISSIONS, STAFF_PERMISSIONS } from "@/lib/auth";
import db from "@/offline/db";
import type { User } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login", "/invite", "/auth"];
const ONBOARDING_PREFIX = "/onboarding";
const READY_TIMEOUT_MS = 8000; // never stay stuck more than 8s

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, clearSession, isAuthenticated, hasCompletedOnboarding } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  const markReady = () => {
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
  };

  useEffect(() => {
    // ── No Supabase (demo mode) ──────────────────────────────
    if (!supabase) {
      markReady();
      return;
    }

    // Safety timeout — never stay stuck more than READY_TIMEOUT_MS
    const safetyTimer = setTimeout(() => {
      console.warn("[AuthProvider] Safety timeout fired — forcing ready");
      markReady();
    }, READY_TIMEOUT_MS);

    // onAuthStateChange is the single source of truth.
    // INITIAL_SESSION fires immediately with the current session (or null).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            await hydrateUser(session.user, setSession);
          } else {
            clearSession();
          }
        } catch (err) {
          console.error("[AuthProvider] hydrateUser error:", err);
          clearSession();
        } finally {
          clearTimeout(safetyTimer);
          markReady();
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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

// ── Hydrate user from Supabase session ───────────────────────
async function hydrateUser(
  supabaseUser: User,
  setSession: ReturnType<typeof useAuthStore.getState>["setSession"]
) {
  // Read current persisted state BEFORE the async query
  // so we can fall back to it if the query times out or fails
  const persisted = useAuthStore.getState();

  // Race membership query against a 7s timeout
  const membership = await Promise.race([
    getBusinessMembership(supabaseUser.id),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
  ]);

  // --- Fallback chain ---
  // 1. Supabase membership (most authoritative)
  // 2. Zustand localStorage persisted state
  // 3. Dexie IndexedDB (survives device restarts and localStorage wipes)
  let businessId   = membership?.business_id   ?? persisted.businessId;
  let businessName = membership?.businesses?.name ?? persisted.businessName;
  let hasOnboarded = membership !== null
    ? !!membership.business_id
    : persisted.hasCompletedOnboarding;

  // If still no businessId after Supabase + Zustand, try Dexie as last resort
  if (!businessId) {
    try {
      const localMember = await db.business_members
        .where("user_id").equals(supabaseUser.id)
        .first();
      if (localMember?.business_id) {
        businessId = localMember.business_id;
        hasOnboarded = true;
        // Try to get the business name from Dexie too
        const localBiz = await db.businesses.get(localMember.business_id);
        if (localBiz?.name) businessName = localBiz.name;
      }
    } catch {
      // Dexie not available (SSR or private mode) — ignore
    }
  }

  const role = (membership?.role ?? (hasOnboarded ? "admin" : null)) as "admin" | "staff" | null;
  const permissions =
    role === "admin"
      ? ADMIN_PERMISSIONS
      : role === "staff"
      ? [...STAFF_PERMISSIONS, ...(membership?.permissions ?? [])]
      : [];

  setSession(
    {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      name: supabaseUser.user_metadata?.full_name as string | undefined,
      avatar_url: supabaseUser.user_metadata?.avatar_url as string | undefined,
    },
    businessId,
    businessName,
    role,
    permissions,
    hasOnboarded,
  );
}
