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
          .maybeSingle();
          
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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{
            backdropFilter: "blur(48px) saturate(200%) brightness(0.85)",
            WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(0.85)",
            backgroundColor: "rgba(0, 0, 0, 0.08)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Ambient light blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.2, 0.12] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)", filter: "blur(60px)" }}
            />
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.08, 0.15, 0.08] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)", filter: "blur(80px)" }}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
              className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)", filter: "blur(70px)" }}
            />
          </div>

          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm mx-5"
          >
            <motion.div
              animate={shake ? { x: [-10, 10, -7, 7, -4, 4, 0] } : {}}
              transition={{ duration: 0.45 }}
              className="relative rounded-3xl overflow-hidden"
            >
              {/* === LIQUID GLASS LAYERS === */}

              {/* Layer 1: Core glass surface */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  backdropFilter: "blur(80px) saturate(180%) brightness(1.05)",
                  WebkitBackdropFilter: "blur(80px) saturate(180%) brightness(1.05)",
                  background: "rgba(255, 255, 255, 0.04)",
                }}
              />

              {/* Layer 2: Iridescent shimmer - thin film interference */}
              <motion.div
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-3xl opacity-[0.07]"
                style={{
                  background: "linear-gradient(135deg, transparent 0%, rgba(120,119,198,1) 20%, rgba(255,154,158,1) 40%, rgba(250,208,196,1) 60%, rgba(167,220,225,1) 80%, transparent 100%)",
                  backgroundSize: "300% 300%",
                }}
              />

              {/* Layer 3: Fresnel top-edge highlight */}
              <div
                className="absolute inset-x-0 top-0 h-px rounded-t-3xl"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 70%, transparent 100%)",
                }}
              />
              <div
                className="absolute inset-x-4 top-0 h-[2px] rounded-full opacity-40"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                  filter: "blur(1px)",
                }}
              />

              {/* Layer 4: Left/right edge reflections */}
              <div
                className="absolute inset-y-8 left-0 w-px opacity-30"
                style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.8), transparent)" }}
              />
              <div
                className="absolute inset-y-8 right-0 w-px opacity-20"
                style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)" }}
              />

              {/* Layer 5: Inner specular wet-spot highlight */}
              <div
                className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-8 opacity-[0.08]"
                style={{
                  background: "radial-gradient(ellipse, rgba(255,255,255,1) 0%, transparent 70%)",
                  filter: "blur(8px)",
                }}
              />

              {/* Layer 6: Outer shadow + glass border */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  boxShadow: [
                    "0 0 0 0.5px rgba(255,255,255,0.15)",
                    "0 32px 80px rgba(0,0,0,0.25)",
                    "0 8px 24px rgba(0,0,0,0.18)",
                    "inset 0 1px 0 rgba(255,255,255,0.12)",
                    "inset 0 -1px 0 rgba(0,0,0,0.08)",
                    "inset 1px 0 0 rgba(255,255,255,0.04)",
                    "inset -1px 0 0 rgba(0,0,0,0.05)",
                  ].join(", "),
                }}
              />

              {/* Content */}
              <div className="relative z-10 p-8">
                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Icon */}
                <div className="flex flex-col items-center text-center mb-7">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative overflow-hidden"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      border: "0.5px solid rgba(99,102,241,0.3)",
                      boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-2xl opacity-20"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5), transparent)" }} />
                    <Shield className="w-7 h-7 relative z-10" style={{ color: "rgba(139,150,255,1)" }} />
                  </div>
                  <h2
                    className="text-xl font-bold tracking-tight"
                    style={{ color: "rgba(255,255,255,0.95)", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                  >{title}</h2>
                  <p
                    className="text-sm mt-1.5"
                    style={{ color: "rgba(255,255,255,0.55)", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
                  >Enter your admin PIN to continue</p>
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
                        style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)" }}
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
                      background: "rgba(255,255,255,0.04)",
                      border: "0.5px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(0,0,0,0.1)",
                      color: "rgba(255,255,255,0.95)",
                      caretColor: "rgba(139,150,255,1)",
                      backdropFilter: "blur(8px)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = "0.5px solid rgba(99,102,241,0.5)";
                      e.currentTarget.style.boxShadow = "inset 0 2px 12px rgba(0,0,0,0.15), 0 0 0 3px rgba(99,102,241,0.1), 0 0 20px rgba(99,102,241,0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "0.5px solid rgba(255,255,255,0.1)";
                      e.currentTarget.style.boxShadow = "inset 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(0,0,0,0.1)";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setShow((s) => !s); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none appearance-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "0.5px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.75)",
                      backdropFilter: "blur(8px)",
                    }}
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
                  whileHover={{ scale: pin.length >= 4 ? 1.015 : 1 }}
                  whileTap={{ scale: pin.length >= 4 ? 0.975 : 1 }}
                  className="w-full py-3.5 font-bold rounded-2xl text-base transition-all text-white relative overflow-hidden disabled:opacity-30"
                  style={{
                    background: pin.length >= 4
                      ? "linear-gradient(135deg, rgba(99,102,241,0.75) 0%, rgba(139,92,246,0.75) 100%)"
                      : "rgba(255,255,255,0.05)",
                    border: pin.length >= 4
                      ? "0.5px solid rgba(139,150,255,0.5)"
                      : "0.5px solid rgba(255,255,255,0.08)",
                    boxShadow: pin.length >= 4
                      ? "0 8px 32px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)"
                      : "none",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {pin.length >= 4 && (
                    <div
                      className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)" }}
                    />
                  )}
                  <span className="relative z-10">
                    {checking ? "Verifying…" : "Unlock"}
                  </span>
                </motion.button>

                <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Press Enter to unlock
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
