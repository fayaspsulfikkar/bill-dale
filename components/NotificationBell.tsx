"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = unreadCount();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-80 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary flex items-center gap-1 hover:text-primary/80"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`p-4 border-b border-border/20 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className={!n.read ? "" : "pl-3.5"}>
                        <p className="text-sm font-medium">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
