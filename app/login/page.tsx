"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuthStore();
  const router = useRouter();
  const isMockMode = !supabase;

  const handleGoogle = async () => {
    if (isMockMode) {
      setLoading(true);
      setTimeout(() => {
        login({ id: "mock-id-123", email: "admin@billdale.com", name: "Admin User" });
        router.push("/dashboard");
      }, 600);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (isMockMode) {
      setEmailLoading(true);
      setTimeout(() => {
        login({ id: "mock-id-123", email, name: "Admin User" });
        router.push("/dashboard");
      }, 600);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setEmailLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccessMsg("Account created successfully! You can now sign in.");
        setIsSignUp(false); // Switch to login mode
        setPassword(""); // Clear password for security
      } else {
        await signInWithEmail(email, password);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/4 w-[300px] h-[300px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.4)] mb-5"
          >
            <span className="font-black text-primary-foreground text-4xl">B</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black tracking-tighter">
              BILL<span className="text-primary">DALE</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-medium">Offline-First POS &amp; GST Billing</p>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-7 shadow-2xl"
        >
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">{isSignUp ? "Create an account" : "Welcome back"}</h2>
            <p className="text-muted-foreground text-sm mt-1">{isSignUp ? "Sign up to get started" : "Sign in to access your dashboard"}</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm"
            >
              {successMsg}
            </motion.div>
          )}

          {isMockMode && (
            <div className="p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium">
              ⚡ Demo mode — connect Supabase to enable real login.
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4 mb-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                required
              />
            </div>
            <motion.button
              type="submit"
              disabled={emailLoading || loading}
              whileHover={{ scale: (emailLoading || loading) ? 1 : 1.02 }}
              whileTap={{ scale: (emailLoading || loading) ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {emailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? "Sign Up" : "Sign In with Email")}
            </motion.button>
          </form>

          <div className="text-center mb-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative flex items-center py-2 mb-4">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <motion.button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogle}
            disabled={loading || emailLoading}
            whileHover={{ scale: (loading || emailLoading) ? 1 : 1.02 }}
            whileTap={{ scale: (loading || emailLoading) ? 1 : 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-gray-800 font-semibold rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </motion.button>

          <p className="text-center text-xs text-muted-foreground mt-5">
            By continuing, you agree to our{" "}
            <span className="text-primary cursor-pointer hover:underline">Terms</span> &amp;{" "}
            <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
