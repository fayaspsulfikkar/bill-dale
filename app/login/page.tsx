"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Mock Login for now if Supabase isn't connected
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      setTimeout(() => {
        login({
          id: "mock-id-123",
          email,
          role: "admin",
          branch_id: "branch-1",
          created_at: new Date().toISOString(),
        });
        router.push("/dashboard");
      }, 800);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // In a real app, you would fetch user role/branch from your users table here.
      login({
        id: data.user.id,
        email: data.user.email!,
        role: "admin", // Replace with actual fetched role
        branch_id: "branch-1",
        created_at: data.user.created_at,
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 selection:bg-primary/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.4)]">
              <span className="font-bold text-background text-xl">B</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter">
              BILL<span className="text-primary">DALE</span>
            </h1>
          </motion.div>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">Access System</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access the POS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Operator ID (Email)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="operator@billdale.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 h-12 text-lg focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Access Code
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 h-12 text-lg focus-visible:ring-primary/50"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-md font-bold uppercase tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
              >
                {loading ? "Authenticating..." : "Initialize Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
