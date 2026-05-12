"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

interface AdminPinDialogProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
}

export function AdminPinDialog({
  open,
  onSuccess,
  onClose,
  title = "Admin Access Required",
}: AdminPinDialogProps) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const { businessId } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setShow(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async () => {
    if (!pin || pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      triggerShake();
      return;
    }
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
        setError("No PIN set. Go to Settings to create one first.");
        triggerShake();
        return;
      }
      if (data.admin_pin === pin) {
        onSuccess();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
        triggerShake();
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong. Try again.");
      triggerShake();
    } finally {
      setChecking(false);
    }
  };

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(0,0,0,0.75)" }}
        >
          {/* Subtle background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm mx-4"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-2xl">

              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your admin PIN to continue</p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PIN input */}
              <motion.div
                animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="relative mb-6"
              >
                <input
                  ref={inputRef}
                  type={show ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder="• • • •"
                  className="w-full h-16 px-6 pr-14 rounded-2xl bg-secondary border border-border/50 text-3xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </motion.div>

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { if (pin.length < 8) { setPin((p) => p + n); setError(""); } }}
                    className="h-14 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/30 text-lg font-semibold transition-colors"
                  >
                    {n}
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setPin("")}
                  className="h-14 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/30 text-sm font-semibold text-muted-foreground transition-colors"
                >
                  Clear
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { if (pin.length < 8) { setPin((p) => p + 0); setError(""); } }}
                  className="h-14 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/30 text-lg font-semibold transition-colors"
                >
                  0
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="h-14 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/30 text-xl font-semibold text-muted-foreground transition-colors"
                >
                  ⌫
                </motion.button>
              </div>

              {/* Unlock button */}
              <motion.button
                onClick={handleVerify}
                disabled={checking || pin.length < 4}
                whileHover={{ scale: pin.length >= 4 ? 1.02 : 1 }}
                whileTap={{ scale: pin.length >= 4 ? 0.97 : 1 }}
                className="w-full h-13 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl text-base disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                {checking ? "Verifying…" : "Unlock"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
