"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Store, ShieldAlert, Loader2 } from "lucide-react";

export function BranchLoginModal() {
  const { selectedBranchId, setSelectedBranchId } = usePOSStore();
  const { businessId } = useAuthStore();
  const branches = useLiveQuery(() => db.branches.toArray(), []);
  
  const [branchCode, setBranchCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If a branch is already selected, hide the modal.
  if (selectedBranchId !== null) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const codeUpper = branchCode.trim().toUpperCase();
      const branch = branches?.find(b => b.branch_code?.toUpperCase() === codeUpper);

      if (!branch) {
        setError("Invalid Branch Code.");
        setIsLoading(false);
        return;
      }

      if (branch.password !== password) {
        setError("Incorrect password for this branch.");
        setIsLoading(false);
        return;
      }

      if (!branch.is_active) {
        setError("This branch is currently inactive.");
        setIsLoading(false);
        return;
      }

      // Success! Lock the terminal to this branch
      setSelectedBranchId(branch.id);
    } catch (err) {
      setError("An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl overflow-hidden p-0">
        <div className="h-2 bg-primary w-full" />
        <div className="p-8">
          <DialogHeader className="space-y-3 mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 mx-auto">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-center tracking-tight">Terminal Locked</DialogTitle>
            <DialogDescription className="text-center text-base">
              Enter branch credentials to unlock this POS terminal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Branch Code</Label>
              <Input
                required
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
                placeholder="e.g. BATH01"
                className="h-12 bg-muted/50 border-border/50 text-center font-mono text-lg uppercase tracking-widest focus-visible:ring-primary"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
              <Input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 bg-muted/50 border-border/50 text-center text-2xl tracking-[0.2em] focus-visible:ring-primary"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-12 font-bold text-lg" disabled={isLoading || !branchCode || !password}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Lock className="w-5 h-5 mr-2" /> Unlock Terminal
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
