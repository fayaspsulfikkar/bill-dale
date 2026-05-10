"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LayoutDashboard, ShoppingCart, Package, MapPin, BarChart3, Settings, LogOut, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { name: "POS Terminal", href: "/dashboard/pos", icon: ShoppingCart },
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Branches", href: "/dashboard/branches", icon: MapPin },
  { name: "Staff & Users", href: "/dashboard/users", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="w-64 h-screen border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col fixed left-0 top-0">
      <div className="h-20 flex items-center px-6 gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.4)]">
          <span className="font-bold text-background text-sm">B</span>
        </div>
        <h2 className="text-xl font-black tracking-tight uppercase">Bill<span className="text-primary">Dale</span></h2>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} />
              <span className="font-medium relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
