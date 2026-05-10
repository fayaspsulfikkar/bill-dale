"use client";

import { useIsAdmin } from "@/hooks/usePermission";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, adminOnly = false, fallback }: RoleGuardProps) {
  const isAdmin = useIsAdmin();

  if (adminOnly && !isAdmin) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
        <ShieldAlert className="w-12 h-12 opacity-30" />
        <div className="text-center">
          <p className="font-semibold text-foreground">Access Denied</p>
          <p className="text-sm">This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
