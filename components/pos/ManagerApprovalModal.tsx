"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPinDialog } from "@/components/AdminPinDialog";
import { type POSAction, ACTION_LABELS } from "@/lib/permissions";
import { Lock, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  action: POSAction;
  onApproved: () => void;
  onClose: () => void;
}

export function ManagerApprovalModal({ open, action, onApproved, onClose }: Props) {
  return (
    <>
      <AdminPinDialog
        open={open}
        title={`Manager Approval — ${ACTION_LABELS[action]}`}
        onSuccess={() => {
          onApproved();
        }}
        onClose={onClose}
      />
    </>
  );
}
