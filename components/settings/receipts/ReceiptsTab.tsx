"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye, EyeOff, X, Maximize2, Minimize2 } from "lucide-react";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import { RECEIPT_SECTIONS } from "./receipt-constants";
import BusinessInfoSection from "./BusinessInfoSection";
import ContentSection from "./ContentSection";
import BrandingSection from "./BrandingSection";
import LayoutSection from "./LayoutSection";
import TaxPaymentSection from "./TaxPaymentSection";
import CustomerInfoSection from "./CustomerInfoSection";
import PrintOptionsSection from "./PrintOptionsSection";
import DigitalReceiptsSection from "./DigitalReceiptsSection";
import TemplateSection from "./TemplateSection";
import ReceiptPreview from "./ReceiptPreview";

export default function ReceiptsTab() {
  const {
    form, u, saving, saved,
    templates, saveTemplate, duplicateTemplate,
    deleteTemplate, setDefaultTemplate, loadTemplate, applyTheme,
  } = useReceiptSettings();

  const [activeSection, setActiveSection] = useState("business");
  const [showPreview, setShowPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "business": return <BusinessInfoSection form={form} u={u} />;
      case "content": return <ContentSection form={form} u={u} />;
      case "branding": return <BrandingSection form={form} u={u} />;
      case "layout": return <LayoutSection form={form} u={u} />;
      case "tax": return <TaxPaymentSection form={form} u={u} />;
      case "customer": return <CustomerInfoSection form={form} u={u} />;
      case "print": return <PrintOptionsSection form={form} u={u} />;
      case "digital": return <DigitalReceiptsSection form={form} u={u} />;
      case "templates":
        return (
          <TemplateSection
            form={form}
            u={u}
            templates={templates}
            saveTemplate={saveTemplate}
            duplicateTemplate={duplicateTemplate}
            deleteTemplate={deleteTemplate}
            setDefaultTemplate={setDefaultTemplate}
            loadTemplate={loadTemplate}
            applyTheme={applyTheme}
          />
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-4 relative pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-background/95 backdrop-blur-sm py-4 -my-4 mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Receipt Customization</h2>
          <p className="text-sm text-muted-foreground">Configure how your printed and digital receipts look.</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all shadow-sm ${
            showPreview
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Sub-navigation ── */}
        <div className="w-44 shrink-0 space-y-0.5 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden">
          {RECEIPT_SECTIONS.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  active
                    ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-[3px] border-transparent"
                }`}
              >
                <span className="text-sm">{section.emoji}</span>
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Section Content — always full width ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Live Preview — Slide-out Overlay Drawer ── */}
      <AnimatePresence>
        {showPreview && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
              onClick={() => setShowPreview(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-card border-l border-border shadow-2xl transition-all duration-300 ${isExpanded ? "w-[850px]" : "w-[380px]"}`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Live Preview</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title={isExpanded ? "Minimize" : "Expand Details"}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setIsExpanded(false);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Paper size pill */}
              <div className="px-5 pt-3 pb-1">
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                  {form.receipt_paper_size || "80mm"} • {form.receipt_layout_mode === "compact" ? "Compact" : "Detailed"} • {form.receipt_font_size || 9}pt
                </span>
              </div>

              {/* Scrollable Preview */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <ReceiptPreview form={form} isExpanded={isExpanded} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Auto-save toast ── */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-30"
          >
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-xl border ${
              saved
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-card/90 border-border/50 text-muted-foreground"
            }`}>
              {saved ? (
                <><Check className="w-4 h-4" /> Saved</>
              ) : (
                <><div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> Saving...</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
