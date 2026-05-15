"use client";

import { usePOSStore } from "@/store/posStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { keys: ["/"], description: "Focus search bar" },
  { keys: ["Enter"], description: "Add scanned/matched product to cart" },
  { keys: ["Ctrl", "P"], description: "Open payment flow" },
  { keys: ["Ctrl", "H"], description: "Hold current order" },
  { keys: ["Ctrl", "R"], description: "Open return / exchange" },
  { keys: ["Ctrl", "D"], description: "Focus discount field" },
  { keys: ["Ctrl", "B"], description: "Open held orders" },
  { keys: ["Ctrl", "O"], description: "Open recent orders" },
  { keys: ["Ctrl", "Q"], description: "Quick add custom item" },
  { keys: ["Ctrl", "K"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close modal / clear search" },
];

export function KeyboardShortcutsModal() {
  const { showShortcutsHelp, setShowShortcutsHelp } = usePOSStore();

  return (
    <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
      <DialogContent className="sm:max-w-md bg-card border-border/60 shadow-2xl print:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/30 py-2">
          {shortcuts.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border/60 rounded-md">{key}</kbd>
                    {i < keys.length - 1 && <span className="text-muted-foreground mx-0.5 text-xs">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
