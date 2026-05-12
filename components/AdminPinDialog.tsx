"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

interface AdminPinDialogProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
}

export function AdminPinDialog({ open, onSuccess, onClose, title = "Admin Access Required" }: AdminPinDialogProps) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const { businessId } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleVerify = async () => {
    if (!pin || pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    setChecking(true);
    setError("");

    try {
      if (!supabase || !businessId) {
        // Demo mode — accept any 4+ digit PIN
        onSuccess();
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("businesses")
        .select("admin_pin")
        .eq("id", businessId)
        .single();

      if (dbErr || !data?.admin_pin) {
        setError("No PIN set. Go to Settings → Security to set one.");
        return;
      }

      if (data.admin_pin === pin) {
        onSuccess();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-xs shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">Enter your admin PIN</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs"
              >
                {error}
              </motion.div>
            )}

            <div className="relative mb-4">
              <input
                ref={inputRef}
                type={show ? "text" : "password"}
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="••••"
                className="w-full h-12 px-4 pr-11 rounded-xl bg-secondary border border-border/50 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <motion.button
              onClick={handleVerify}
              disabled={checking || pin.length < 4}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              {checking ? "Verifying…" : "Unlock"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
