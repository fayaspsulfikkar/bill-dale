"use client";

import { usePOSStore } from "@/store/posStore";
import { useCartStore } from "@/store/cartStore";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import { useState } from "react";

export function OrderNotesField() {
  const { orderNotes, setOrderNotes } = usePOSStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border/40 pt-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <StickyNote className="w-3.5 h-3.5" />
        <span className="flex-1 text-left font-semibold">Order Notes</span>
        {orderNotes && <span className="text-primary text-[10px]">Added</span>}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <Input
          className="mt-2 h-9 text-sm"
          placeholder="Special instructions, references..."
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}
