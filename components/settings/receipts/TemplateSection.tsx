"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Copy, Trash2, Star, Check, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReceiptSettingsSnapshot, ReceiptTheme } from "./receipt-types";
import type { ReceiptTemplate } from "@/offline/db";
import { THEME_PRESETS } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
  u: (patch: Partial<ReceiptSettingsSnapshot>) => void;
  templates: ReceiptTemplate[];
  saveTemplate: (name: string, theme?: ReceiptTheme) => Promise<ReceiptTemplate | undefined>;
  duplicateTemplate: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setDefaultTemplate: (id: string) => Promise<void>;
  loadTemplate: (template: ReceiptTemplate) => void;
  applyTheme: (overrides: Partial<ReceiptSettingsSnapshot>) => void;
}

export default function TemplateSection({
  form, u, templates, saveTemplate, duplicateTemplate,
  deleteTemplate, setDefaultTemplate, loadTemplate, applyTheme,
}: Props) {
  const [newName, setNewName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSavingTemplate(true);
    await saveTemplate(newName.trim());
    setNewName("");
    setShowNameInput(false);
    setSavingTemplate(false);
  };

  return (
    <div className="space-y-4">
      {/* Theme Presets */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" /> Quick Themes
          </CardTitle>
          <CardDescription>Apply a preset theme to quickly configure your receipt style.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {THEME_PRESETS.map(theme => (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.overrides)}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 hover:border-primary/30 transition-all text-left group"
              >
                <span className="text-xl mt-0.5">{theme.emoji}</span>
                <div>
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{theme.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{theme.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Templates */}
      <Card className="bg-card/50 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-primary" /> Saved Templates
          </CardTitle>
          <CardDescription>Save your current settings as a template for reuse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Save New */}
          {showNameInput ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Template name…"
                className="flex-1 bg-background/50"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setShowNameInput(false); setNewName(""); } }}
              />
              <Button size="sm" onClick={handleSave} disabled={!newName.trim() || savingTemplate}>
                {savingTemplate ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNameInput(false); setNewName(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNameInput(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Save Current as Template
            </Button>
          )}

          {/* Template List */}
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No saved templates yet. Save your current settings to create one.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {templates.map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {t.is_default && (
                          <Star className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {THEME_PRESETS.find(th => th.id === t.theme)?.emoji} {t.theme} • {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => loadTemplate(t)}
                          className="text-xs px-2 py-1 rounded-md bg-primary/5 text-primary hover:bg-primary/15 transition-colors font-medium"
                          title="Load this template"
                        >
                          Load
                        </button>
                        {!t.is_default && (
                          <button
                            onClick={() => setDefaultTemplate(t.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Set as default"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => duplicateTemplate(t.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === t.id ? (
                          <button
                            onClick={() => { deleteTemplate(t.id); setConfirmDeleteId(null); }}
                            className="text-[10px] px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
