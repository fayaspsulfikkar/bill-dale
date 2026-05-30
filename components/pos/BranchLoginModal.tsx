"use client";

import { useEffect, useState } from "react";
import { useBranches } from "@/lib/api/queries";
import { supabase } from "@/lib/supabase";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Store, ShieldAlert, Loader2 } from "lucide-react";

export function BranchLoginModal() {
  const { selectedBranchId, setSelectedBranchId } = usePOSStore();
  const { businessId } = useAuthStore();
  const { data: branches, isLoading: branchesLoading } = useBranches(businessId || null);
  const [business, setBusiness] = useState<any>(undefined);

  useEffect(() => {
    if (businessId) {
      supabase.from("businesses").select("*").eq("id", businessId).single().then(({ data }) => setBusiness(data));
    }
  }, [businessId]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // While branches are loading from Supabase, show nothing to avoid flicker
  if (branchesLoading) return null;

  if (selectedBranchId !== null || !branches || branches.length === 0) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const branch = branches?.find(b => b.id === selectedBranch);

      if (!branch) {
        setError("Please select a branch.");
        setIsLoading(false);
        return;
      }

      if (business?.admin_pin && password !== business.admin_pin) {
        setError("Incorrect Admin PIN.");
        setIsLoading(false);
        return;
      }

      if (!branch.is_active) {
        setError("This branch is currently inactive.");
        setIsLoading(false);
        return;
      }

      setSelectedBranchId(branch.id);
    } catch {
      setError("An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  // Full-screen blocking overlay — NOT a dismissable dialog
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden ring-1 ring-border/60">
          <div className="h-1.5 bg-primary w-full" />
          <div className="p-8">
            <div className="space-y-3 mb-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Branch Required</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This device is not linked to a branch. Select a branch and enter the Admin PIN to unlock access to the dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Branch</Label>
                <select
                  required
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full h-12 bg-muted/50 border border-border/50 text-center text-base font-bold rounded-lg outline-none focus:ring-2 focus:ring-primary appearance-none px-4"
                >
                  <option value="" disabled>-- Select a Branch --</option>
                  {branches.filter(b => b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.name}{b.location ? ` (${b.location})` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin PIN</Label>
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••"
                  className="h-12 bg-muted/50 border-border/50 text-center text-2xl tracking-[0.2em] focus-visible:ring-primary"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 font-bold text-base"
                disabled={isLoading || !selectedBranch || !password}
              >
                {isLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><Lock className="w-5 h-5 mr-2" /> Unlock &amp; Continue</>
                }
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
