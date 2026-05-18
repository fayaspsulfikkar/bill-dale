"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Clock } from "lucide-react";
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
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (currentPin?: string) => {
    const pinToVerify = currentPin ?? pin;
    if (!pinToVerify || pinToVerify.length < 4) {
      setError("Enter all 4 digits.");
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
        const localBiz = await db.businesses.get(businessId);
        if (localBiz?.admin_pin) actualPin = localBiz.admin_pin;
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
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(val);
    setError("");
    if (val.length === 4) {
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
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm"
          >
            <motion.div
              animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative bg-slate-900 text-slate-50 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="p-8">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                  <p className="text-sm text-slate-400 mt-1">Enter your 4-digit admin PIN</p>
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
                    maxLength={4}
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
                    {[0, 1, 2, 3].map((i) => {
                      const filled = i < pin.length;
                      const active = i === pin.length;
                      return (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                            active
                              ? "bg-slate-800 border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                              : filled
                              ? "bg-indigo-500/10 border border-indigo-500/30"
                              : "bg-slate-800/50 border border-slate-700"
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

                {/* Duration Select */}
                <div className="relative mb-8">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full h-11 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    <option value={10}>Unlock for 10 minutes</option>
                    <option value={20}>Unlock for 20 minutes</option>
                    <option value={30}>Unlock for 30 minutes</option>
                    <option value={60}>Unlock for 1 hour</option>
                    <option value={120}>Unlock for 2 hours</option>
                  </select>
                </div>

                {/* Unlock Button */}
                <button
                  onClick={() => handleVerify()}
                  disabled={checking || pin.length < 4}
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200 ${
                    pin.length >= 4
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {checking ? "Verifying..." : "Unlock Access"}
                </button>
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
