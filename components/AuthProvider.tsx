"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, pathname, mounted, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-background flex items-center justify-center font-bold text-primary tracking-widest text-sm uppercase animate-pulse">Initializing...</div>;
  }

  // Prevent flashing protected content before redirect
  if (!isAuthenticated && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
