"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Phone, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

type Tab = "google" | "phone";
type PhoneStep = "number" | "otp";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1",  flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
];

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("google");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("number");

  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const router = useRouter();
  const isMockMode = !supabase;

  // ── Google ───────────────────────────────────────────────
  const handleGoogle = async () => {
    if (isMockMode) {
      setGoogleLoading(true);
      setTimeout(() => {
        login({ id: "mock-id", email: "admin@billdale.com", name: "Admin User" });
        router.push("/dashboard");
      }, 600);
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  // ── Phone: Send OTP ──────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phone || phone.length < 7) { setError("Enter a valid phone number."); return; }
    setError(null);
    setPhoneLoading(true);
    const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

    if (isMockMode) {
      setTimeout(() => { setPhoneStep("otp"); setPhoneLoading(false); startResendTimer(); }, 800);
      return;
    }

    try {
      const { error: err } = await supabase!.auth.signInWithOtp({ phone: fullPhone });
      if (err) throw err;
      setPhoneStep("otp");
      startResendTimer();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Phone: Verify OTP ────────────────────────────────────
  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) { setError("Enter the 6-digit code."); return; }
    setError(null);
    setPhoneLoading(true);
    const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

    if (isMockMode) {
      setTimeout(() => {
        login({ id: "mock-phone", email: `${fullPhone}@phone.billdale`, name: "Phone User" });
        router.push("/dashboard");
      }, 600);
      return;
    }

    try {
      const { error: err } = await supabase!.auth.verifyOtp({
        phone: fullPhone, token, type: "sms",
      });
      if (err) throw err;
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
      setPhoneLoading(false);
    }
  };

  // ── OTP input helpers ─────────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) setOtp(text.split(""));
    e.preventDefault();
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const id = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; });
    }, 1000);
  };

  const resetPhone = () => {
    setPhoneStep("number");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.4)] mb-4"
          >
            <span className="font-black text-primary-foreground text-3xl">B</span>
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter">
            BILL<span className="text-primary">DALE</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1 font-medium">Offline-First POS &amp; GST Billing</p>
        </div>

        {/* Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 border-b border-border/30">
            {(["google", "phone"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); resetPhone(); }}
                className={`py-3.5 text-sm font-semibold transition-colors relative ${
                  tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "google" ? "Google" : "Phone"}
                {tab === t && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Demo / error banners */}
            {isMockMode && (
              <div className="p-2.5 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium">
                ⚡ Demo mode — Supabase not connected.
              </div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="p-2.5 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs"
              >
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">

              {/* ── Google tab ── */}
              {tab === "google" && (
                <motion.div key="google" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <p className="text-sm text-muted-foreground mb-5 text-center">Sign in with your Google account</p>
                  <motion.button
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    whileHover={{ scale: googleLoading ? 1 : 1.02 }}
                    whileTap={{ scale: googleLoading ? 1 : 0.97 }}
                    className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-gray-800 font-semibold rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {googleLoading ? "Signing in…" : "Continue with Google"}
                  </motion.button>
                </motion.div>
              )}

              {/* ── Phone tab ── */}
              {tab === "phone" && (
                <motion.div key="phone" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <AnimatePresence mode="wait">

                    {/* Step 1: Enter number */}
                    {phoneStep === "number" && (
                      <motion.div key="enter-phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <p className="text-sm text-muted-foreground mb-4 text-center">Enter your mobile number</p>
                        <div className="flex gap-2 mb-4">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="h-12 px-2 rounded-xl bg-secondary border border-border/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                            className="flex-1 h-12 px-4 rounded-xl bg-secondary border border-border/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                            maxLength={12}
                            autoFocus
                          />
                        </div>
                        <motion.button
                          onClick={handleSendOtp}
                          disabled={phoneLoading || phone.length < 7}
                          whileHover={{ scale: phoneLoading ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                        >
                          {phoneLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <>
                              <Phone className="w-4 h-4" />
                              Send OTP
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Step 2: Enter OTP */}
                    {phoneStep === "otp" && (
                      <motion.div key="enter-otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="text-center mb-5">
                          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                          <p className="text-sm font-semibold">Code sent!</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            OTP sent to <span className="font-mono font-semibold text-foreground">{countryCode} {phone}</span>
                          </p>
                        </div>

                        {/* 6-digit OTP boxes */}
                        <div className="flex gap-2 justify-center mb-5" onPaste={handleOtpPaste}>
                          {otp.map((digit, idx) => (
                            <input
                              key={idx}
                              id={`otp-${idx}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              autoFocus={idx === 0}
                              className="w-11 h-13 text-center text-xl font-black rounded-xl bg-secondary border-2 border-border/50 focus:border-primary focus:outline-none transition-colors"
                            />
                          ))}
                        </div>

                        <motion.button
                          onClick={handleVerifyOtp}
                          disabled={phoneLoading || otp.join("").length !== 6}
                          whileHover={{ scale: phoneLoading ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-3"
                        >
                          {phoneLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : "Verify & Sign In"}
                        </motion.button>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <button onClick={resetPhone} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <ArrowLeft className="w-3 h-3" /> Change number
                          </button>
                          {resendTimer > 0 ? (
                            <span>Resend in {resendTimer}s</span>
                          ) : (
                            <button onClick={() => { handleSendOtp(); }} className="text-primary hover:underline font-medium">
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </motion.div>
              )}

            </AnimatePresence>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Cross-tab quick switch */}
            {tab === "google" ? (
              <button onClick={() => setTab("phone")} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 py-1">
                <Phone className="w-4 h-4" /> Use phone number instead
              </button>
            ) : (
              <button onClick={() => setTab("google")} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 py-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                </svg>
                Use Google instead
              </button>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to our{" "}
              <span className="text-primary cursor-pointer hover:underline">Terms</span> &amp;{" "}
              <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
