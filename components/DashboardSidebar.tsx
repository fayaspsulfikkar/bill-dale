"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, Package, MapPin, BarChart3,
  Settings, LogOut, Users, Activity, Sun, Moon, Lock,
  ChevronDown, Plus, UserCheck, ShieldOff,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { signOut } from "@/lib/auth";
import Image from "next/image";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { AdminPinDialog } from "@/components/AdminPinDialog";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  staffLocked: boolean; // locked in staff mode?
}

const ALL_NAV_ITEMS: NavItem[] = [
  { name: "POS Terminal",  href: "/dashboard/pos",       icon: ShoppingCart,    staffLocked: false },
  { name: "Overview",      href: "/dashboard",            icon: LayoutDashboard, staffLocked: true  },
  { name: "Inventory",     href: "/dashboard/inventory",  icon: Package,         staffLocked: false },
  { name: "Staff & Users", href: "/dashboard/users",      icon: Users,           staffLocked: true  },
  { name: "Branches",      href: "/dashboard/branches",   icon: MapPin,          staffLocked: true  },
  { name: "Analytics",     href: "/dashboard/analytics",  icon: BarChart3,       staffLocked: true  },
  { name: "Activity Log",  href: "/dashboard/activity",   icon: Activity,        staffLocked: true  },
  { name: "Settings",      href: "/dashboard/settings",   icon: Settings,        staffLocked: true  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, businessId, businessName, staffMode, setStaffMode, clearSession } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [bizOpen, setBizOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<string | null>(null); // href to navigate after PIN
  const [pinForStaffMode, setPinForStaffMode] = useState(false); // PIN to DISABLE staff mode

  // Multi-business: fetch all businesses this user is a member of
  const memberships = useLiveQuery(
    () => user ? db.business_members.where("user_id").equals(user.id).toArray() : [],
    [user?.id]
  );
  const allBusinessIds = memberships?.map((m) => m.business_id) ?? [];
  const businesses = useLiveQuery(
    () => allBusinessIds.length ? db.businesses.where("id").anyOf(allBusinessIds).toArray() : [],
    [allBusinessIds.join(",")]
  );

  const handleLogout = async () => {
    await signOut();
    clearSession();
    router.push("/login");
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const switchBusiness = (id: string) => {
    const biz = businesses?.find((b) => b.id === id);
    if (biz) {
      useAuthStore.getState().setOnboardingComplete(id, biz.name);
      setBizOpen(false);
      router.push("/dashboard");
    }
  };

  const handleNavClick = (item: NavItem) => {
    if (staffMode && item.staffLocked) {
      setPinTarget(item.href);
    } else {
      router.push(item.href);
    }
  };

  const handleEnableStaffMode = () => setStaffMode(true);
  const handleDisableStaffMode = () => setPinForStaffMode(true);

  return (
    <div className="w-64 h-screen border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-40">

      {/* Business Switcher */}
      <div className="relative border-b border-border/30">
        <button
          onClick={() => setBizOpen((o) => !o)}
          className="w-full h-16 flex items-center px-5 gap-3 hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.35)] shrink-0">
            <span className="font-bold text-primary-foreground text-sm">B</span>
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">BillDale</p>
            <p className="text-sm font-bold truncate leading-tight">{businessName ?? "My Business"}</p>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", bizOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {bizOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-full left-2 right-2 bg-popover border border-border/50 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {businesses?.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => switchBusiness(biz.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors text-left",
                    biz.id === businessId && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {biz.name[0].toUpperCase()}
                  </div>
                  <span className="font-medium truncate">{biz.name}</span>
                  {biz.id === businessId && <span className="ml-auto text-xs text-primary">●</span>}
                </button>
              ))}
              <button
                onClick={() => { setBizOpen(false); router.push("/onboarding"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border-t border-border/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Business</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Staff mode banner */}
      <AnimatePresence>
        {staffMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-500 font-semibold flex-1">Staff Mode Active</p>
              <button
                onClick={handleDisableStaffMode}
                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold underline underline-offset-2"
              >
                Exit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {ALL_NAV_ITEMS.map((item) => {
          const isLocked = staffMode && item.staffLocked;
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          if (isLocked) {
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
                title="Requires admin PIN"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                <Lock className="w-3 h-3 shrink-0" />
              </button>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative group text-sm",
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
              <item.icon className={cn("w-4 h-4 relative z-10 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} />
              <span className="font-medium relative z-10">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 border-t border-border/30 space-y-1">
        {/* Staff mode toggle */}
        {!staffMode ? (
          <button
            onClick={handleEnableStaffMode}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors text-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span className="font-medium">Enable Staff Mode</span>
          </button>
        ) : (
          <button
            onClick={handleDisableStaffMode}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-sm"
          >
            <ShieldOff className="w-4 h-4" />
            <span className="font-medium">Exit Staff Mode</span>
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-sm"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {user && (
          <button
            onClick={() => staffMode ? setPinTarget("/dashboard/users") : router.push("/dashboard/users")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
            title="Account & Team"
          >
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.name ?? user.email}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                ADMIN
              </span>
            </div>
            <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* PIN dialogs */}
      <AdminPinDialog
        open={!!pinTarget}
        title={`Admin PIN — ${ALL_NAV_ITEMS.find(i => i.href === pinTarget)?.name ?? "Access"}`}
        onSuccess={() => {
          const target = pinTarget!;
          setPinTarget(null);
          router.push(target);
        }}
        onClose={() => setPinTarget(null)}
      />

      <AdminPinDialog
        open={pinForStaffMode}
        title="Exit Staff Mode"
        onSuccess={() => {
          setPinForStaffMode(false);
          setStaffMode(false);
        }}
        onClose={() => setPinForStaffMode(false)}
      />
    </div>
  );
}
