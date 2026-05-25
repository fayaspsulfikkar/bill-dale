"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";


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
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [durationMins, setDurationMins] = useState(10);
  const { businessId } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Read default timer from settings
  const [settings, setSettings] = useState<any>(null);
  const pinLength = settings?.security_pin_length ?? 4;

  useEffect(() => {
    if (businessId) {
      supabase.from("business_settings").select("*").eq("business_id", businessId).single().then(({ data }) => setSettings(data));
    }
  }, [businessId]);

  useEffect(() => { setMounted(true); }, []);

  // Sync default timer when settings load
  useEffect(() => {
    if (settings?.staff_mode_default_minutes) {
      setDurationMins(settings.staff_mode_default_minutes);
    }
  }, [settings]);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (currentPin?: string) => {
    const pinToVerify = currentPin ?? pin;
    if (!pinToVerify || pinToVerify.length < pinLength) {
      setError(`Enter all ${pinLength} digits.`);
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

      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from("businesses")
          .select("admin_pin")
          .eq("id", businessId)
          .maybeSingle();
        if (!dbErr && data?.admin_pin) actualPin = data.admin_pin;
      }



      if (!actualPin) {
        setError("No PIN set. Go to Settings to create one first.");
        triggerShake();
        return;
      }

      if (actualPin === pinToVerify) {
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, pinLength);
    setPin(val);
    setError("");
    if (val.length === pinLength) {
      handleVerify(val);
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
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Animated Liquid Orbs (Behind the glass) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-80">
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                x: [0, 80, 0],
                y: [0, -60, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/40 blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                x: [0, -70, 0],
                y: [0, 70, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute w-[450px] h-[450px] rounded-full bg-fuchsia-500/30 blur-[100px]"
            />
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm"
          >
            <motion.div
              animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(255,255,255,0.1)"
              }}
            >
              {/* Top Liquid Reflection Highlight */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              
              <div className="relative z-10 p-8 text-white drop-shadow-md">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-5 right-5 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/20"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                  <p className="text-sm text-slate-400 mt-1">Enter your {pinLength}-digit admin PIN</p>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center font-medium">
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PIN Input Area */}
                <div className="relative mb-6">
                  {/* Hidden Input for Keyboard Focus */}
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={pinLength}
                    value={pin}
                    onChange={handlePinChange}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                    aria-label="Enter PIN"
                    autoComplete="off"
                  />
                  
                  {/* Visual 4-Box PIN Display */}
                  <div
                    className="flex justify-center gap-3"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {Array.from({ length: pinLength }).map((_, i) => {
                      const filled = i < pin.length;
                      const active = i === pin.length;
                      return (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                            active
                              ? "bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                              : filled
                              ? "bg-indigo-500/10 border border-indigo-400/30"
                              : "bg-white/5 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                          }`}
                        >
                          {filled ? (
                            <div className="w-3 h-3 bg-white rounded-full" />
                          ) : active && !checking ? (
                            <motion.div
                              animate={{ opacity: [1, 0.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-[2px] h-6 bg-indigo-400 rounded-full"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Duration Chips */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>Unlock duration</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "10m", value: 10 },
                      { label: "20m", value: 20 },
                      { label: "30m", value: 30 },
                      { label: "1hr", value: 60 },
                      { label: "2hr", value: 120 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDurationMins(opt.value)}
                        className={`flex-1 min-w-[3rem] py-1.5 rounded-lg text-xs font-medium transition-all ${
                          durationMins === opt.value
                            ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-indigo-400"
                            : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleVerify()}
                    disabled={checking || pin.length < pinLength}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200 relative overflow-hidden ${
                      pin.length >= pinLength
                        ? "text-white shadow-[0_8px_20px_rgba(99,102,241,0.4)] border border-indigo-400/50"
                        : "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                    }`}
                    style={pin.length >= pinLength ? {
                      background: "linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.8) 100%)",
                    } : {}}
                  >
                    {pin.length >= pinLength && (
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
                    )}
                    {checking ? "Verifying..." : "Unlock Access"}
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl font-medium text-sm text-slate-400 hover:text-white bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  >
                    Back to Staff Mode
                  </button>
                </div>
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
