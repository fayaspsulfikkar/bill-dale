"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye } from "lucide-react";
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
  const [showPreview, setShowPreview] = useState(true);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Receipt Customization</h2>
          <p className="text-sm text-muted-foreground">Configure how your printed and digital receipts look.</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            showPreview
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Sub-navigation ── */}
        <div className="w-44 shrink-0 space-y-0.5">
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

        {/* ── Section Content ── */}
        <div className={`flex-1 min-w-0 ${showPreview ? "max-w-[calc(100%-44rem-3rem)]" : ""}`}>
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

        {/* ── Live Preview Panel ── */}
        {showPreview && (
          <div className="w-[340px] shrink-0">
            <div className="sticky top-0">
              <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> LIVE PREVIEW
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto rounded-xl bg-muted/20 border border-border/50 p-4">
                <ReceiptPreview form={form} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-save toast ── */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50"
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
