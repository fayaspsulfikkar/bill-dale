"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { AdminPinDialog } from "@/components/AdminPinDialog";
import { useActionRequiresPin } from "@/hooks/usePermission";
import { MapPin, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BranchFilterChipProps {
  value: string | "all";
  onChange: (branchId: string | "all") => void;
}

export function BranchFilterChip({ value, onChange }: BranchFilterChipProps) {
  const branches = useLiveQuery(() => db.branches.toArray(), []) || [];
  const { businessId } = useAuthStore();
  const { selectedBranchId } = usePOSStore();
  const requiresPin = useActionRequiresPin("switch_branch");
  
  const [open, setOpen] = useState(false);
  const [pinDialogTarget, setPinDialogTarget] = useState<string | "all" | null>(null);

  // If there's no businessId, we shouldn't show the filter
  if (!businessId) return null;

  const handleSelect = (branchId: string | "all") => {
    // If they select the currently locked branch or if PIN is not required, allow it
    if (branchId === selectedBranchId || !requiresPin) {
      onChange(branchId);
      setOpen(false);
    } else {
      // Trying to view another branch or all branches -> requires PIN
      setPinDialogTarget(branchId);
      setOpen(false);
    }
  };

  const handlePinSuccess = () => {
    if (pinDialogTarget) {
      onChange(pinDialogTarget);
    }
    setPinDialogTarget(null);
  };

  const activeLabel = value === "all" ? "All Branches" : branches.find(b => b.id === value)?.name || "Unknown Branch";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap h-9 px-3 gap-2 rounded-full border border-border/50 bg-card/50 hover:bg-card/80 transition-all font-semibold text-sm",
            value === selectedBranchId && "border-green-500/30 text-green-500 hover:text-green-600 bg-green-500/10"
          )}
        >
          <MapPin className="w-4 h-4" />
          {activeLabel}
          <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-1 rounded-xl bg-card border-border/60 shadow-xl" align="end">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn("w-full justify-start font-medium text-sm rounded-lg", value === "all" ? "bg-primary/10 text-primary" : "")}
              onClick={() => handleSelect("all")}
            >
              <div className="w-4 h-4 mr-2" /> All Branches
            </Button>
            {branches.map(b => (
              <Button
                key={b.id}
                variant="ghost"
                className={cn("w-full justify-start font-medium text-sm rounded-lg", value === b.id ? "bg-primary/10 text-primary" : "")}
                onClick={() => handleSelect(b.id)}
              >
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {b.id === selectedBranchId && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </div>
                {b.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <AdminPinDialog
        open={!!pinDialogTarget}
        title="Admin Access Required"
        onSuccess={handlePinSuccess}
        onClose={() => setPinDialogTarget(null)}
      />
    </>
  );
}
