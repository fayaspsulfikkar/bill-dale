"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import db from "@/offline/db";

interface AdminPinDialogProps {
  open: boolean;
  onSuccess: (unlockUntil?: number) => void;
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
  const [durationMins, setDurationMins] = useState(10);
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
      if (!businessId) {
        onSuccess();
        return;
      }
      
      let actualPin: string | null | undefined = null;

      // 1. Try Supabase first
      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from("businesses")
          .select("admin_pin")
          .eq("id", businessId)
          .maybeSingle(); // Use maybeSingle to avoid throw on 0 rows
          
        if (!dbErr && data?.admin_pin) {
          actualPin = data.admin_pin;
        }
      }

      // 2. Fallback to Dexie if Supabase failed or returned nothing (offline mode)
      if (!actualPin) {
        const localBiz = await db.businesses.get(businessId);
        if (localBiz?.admin_pin) {
          actualPin = localBiz.admin_pin;
        }
      }

      // 3. Verify
      if (!actualPin) {
        setError("No PIN set. Go to Settings to create one first.");
        triggerShake();
        return;
      }

      if (actualPin === pin) {
        onSuccess(Date.now() + durationMins * 60 * 1000);
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
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Ambient glow blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[140px]" />
            <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full bg-violet-500/5 blur-[120px]" />
          </div>

          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm mx-5"
          >
            <motion.div
              animate={shake ? { x: [-10, 10, -7, 7, -4, 4, 0] } : {}}
              transition={{ duration: 0.45 }}
              style={{
                background: "rgba(255, 255, 255, 0.012)",
                backdropFilter: "blur(56px) saturate(160%)",
                WebkitBackdropFilter: "blur(56px) saturate(160%)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.025) inset, 0 1px 0 rgba(255,255,255,0.08) inset",
              }}
              className="rounded-3xl p-8"
            >
              {/* Close */}
              <button
                onClick={onClose}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Icon */}
              <div className="flex flex-col items-center text-center mb-7">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    boxShadow: "0 0 32px rgba(99,102,241,0.15)",
                  }}
                >
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,1)", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>{title}</h2>
                <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>Enter your admin PIN to continue</p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 rounded-xl text-red-300 text-sm text-center"
                      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.12)" }}
                    >
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PIN input */}
              <div className="relative mb-5">
                <input
                  ref={inputRef}
                  type={show ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder="• • • •"
                  className="w-full h-14 px-5 pr-14 rounded-2xl text-2xl font-mono tracking-[0.6em] text-center focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1) inset",
                    color: "rgba(255,255,255,1)",
                    caretColor: "white",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(99,102,241,0.35)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15) inset, 0 0 0 3px rgba(99,102,241,0.08)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15) inset";
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setShow((s) => !s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>

              {/* Duration selection */}
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-4 h-4 text-white/50" />
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/90 focus:outline-none focus:border-primary/50 appearance-none"
                  style={{ backdropFilter: "blur(8px)" }}
                >
                  <option value={10} className="bg-slate-900 text-white">Unlock for 10 minutes</option>
                  <option value={20} className="bg-slate-900 text-white">Unlock for 20 minutes</option>
                  <option value={30} className="bg-slate-900 text-white">Unlock for 30 minutes</option>
                  <option value={60} className="bg-slate-900 text-white">Unlock for 1 hour</option>
                  <option value={120} className="bg-slate-900 text-white">Unlock for 2 hours</option>
                </select>
              </div>

              {/* Unlock button */}
              <motion.button
                onClick={handleVerify}
                disabled={checking || pin.length < 4}
                whileHover={{ scale: pin.length >= 4 ? 1.02 : 1 }}
                whileTap={{ scale: pin.length >= 4 ? 0.97 : 1 }}
                className="w-full h-13 py-3.5 font-bold rounded-2xl text-base transition-all text-white relative overflow-hidden disabled:opacity-40"
                style={{
                  background: pin.length >= 4
                    ? "linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(139,92,246,0.9) 100%)"
                    : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  boxShadow: pin.length >= 4 ? "0 8px 32px rgba(99,102,241,0.35)" : "none",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span className="relative z-10">
                  {checking ? "Verifying…" : "Unlock"}
                </span>
                {/* Shine */}
                {pin.length >= 4 && (
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)" }}
                  />
                )}
              </motion.button>

              {/* Hint */}
              <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.55)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>Press Enter to unlock</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
