"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { getBusinessMembership, ADMIN_PERMISSIONS, STAFF_PERMISSIONS } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/invite"];
const ONBOARDING_PATH = "/onboarding";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, clearSession, isAuthenticated, hasCompletedOnboarding } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // If no Supabase, fall into mock mode — allow normal navigation
    if (!supabase) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (session?.user) {
        await hydrateSession(session.user);
      } else {
        clearSession();
      }
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await hydrateSession(session.user);
      } else {
        clearSession();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  async function hydrateSession(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
    const membership = await getBusinessMembership(supabaseUser.id);
    const role = membership?.role ?? null;
    const permissions = role === 'admin'
      ? ADMIN_PERMISSIONS
      : role === 'staff'
        ? [...STAFF_PERMISSIONS, ...(membership?.permissions ?? [])]
        : [];

    setSession(
      {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: supabaseUser.user_metadata?.full_name as string | undefined,
        avatar_url: supabaseUser.user_metadata?.avatar_url as string | undefined,
      },
      membership?.business_id ?? null,
      membership?.businesses?.name ?? null,
      role as 'admin' | 'staff' | null,
      permissions,
      !!membership?.business_id,
    );
  }

  // Route guarding
  useEffect(() => {
    if (!mounted || loading || !supabase) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const isOnboarding = pathname.startsWith(ONBOARDING_PATH);
    const isDashboard = pathname.startsWith("/dashboard");

    if (!isAuthenticated && !isPublic && !isOnboarding) {
      router.push("/login");
    } else if (isAuthenticated && pathname === "/login") {
      router.push(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
    } else if (isAuthenticated && isDashboard && !hasCompletedOnboarding) {
      router.push("/onboarding");
    } else if (isAuthenticated && isOnboarding && hasCompletedOnboarding) {
      router.push("/dashboard");
    }
  }, [mounted, loading, isAuthenticated, hasCompletedOnboarding, pathname, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.4)] animate-pulse">
            <span className="font-bold text-background text-xl">B</span>
          </div>
          <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase animate-pulse">Initializing...</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isAuthenticated && !isPublic && !pathname.startsWith(ONBOARDING_PATH)) {
    return null;
  }

  return <>{children}</>;
}
