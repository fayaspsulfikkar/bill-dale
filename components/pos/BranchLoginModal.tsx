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
  const business = useLiveQuery(() => businessId ? db.businesses.get(businessId) : undefined, [businessId]);
  
  const [selectedBranch, setSelectedBranch] = useState("");
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

      if (branch.status !== 'active') {
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
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Branch</Label>
              <select
                required
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full h-12 bg-muted/50 border-border/50 text-center text-lg font-bold rounded-md outline-none focus:ring-2 focus:ring-primary appearance-none px-4"
              >
                <option value="" disabled>-- Select a Branch --</option>
                {branches?.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.address ? `(${b.address})` : ""}</option>
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

            <Button type="submit" className="w-full h-12 font-bold text-lg" disabled={isLoading || !selectedBranch || !password}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Lock className="w-5 h-5 mr-2" /> Lock to Branch
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
