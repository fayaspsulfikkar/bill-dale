"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Shield, Receipt, Database, Settings2, Monitor,
  Users, CreditCard, PackageOpen, Users2, Bell, Plug, Sparkles, Palette, Code, Search, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import GeneralTab from "@/components/settings/GeneralTab";
import SecurityTab from "@/components/settings/SecurityTab";
import ReceiptsTab from "@/components/settings/receipts/ReceiptsTab";
import DevicesTab from "@/components/settings/DevicesTab";
import SyncTab from "@/components/settings/SyncTab";
import UsersTab from "@/components/settings/UsersTab";
import PaymentsTab from "@/components/settings/PaymentsTab";
import InventoryTab from "@/components/settings/InventoryTab";
import CustomersTab from "@/components/settings/CustomersTab";

type SettingsTab =
  | "general" | "security" | "users" | "payments" | "receipts"
  | "inventory" | "customers" | "devices" | "sync"
  | "notifications" | "integrations" | "ai"
  | "appearance" | "advanced";

const TAB_GROUPS = [
  {
    title: "Core",
    tabs: [
      { id: "general", label: "General", icon: Store, keywords: "business profile currency tax invoice pos behavior hours" },
      { id: "security", label: "Security", icon: Shield, keywords: "pin rbac roles lock session audit logs permissions" },
      { id: "users", label: "Users & Staff", icon: Users, keywords: "staff profiles shifts attendance performance" },
      { id: "payments", label: "Payments", icon: CreditCard, keywords: "upi gateway razorpay stripe refund split tip" },
      { id: "receipts", label: "Receipts", icon: Receipt, keywords: "print a4 thermal visual logo layout header footer" },
    ]
  },
  {
    title: "Operations",
    tabs: [
      { id: "inventory", label: "Inventory Rules", icon: PackageOpen, keywords: "barcode sku expiry batch tracking reorder automation" },
      { id: "customers", label: "Customers & Loyalty", icon: Users2, keywords: "loyalty credit membership referral birthday" },
      { id: "devices", label: "Hardware & Devices", icon: Monitor, keywords: "printers scanner cash drawer bluetooth network" },
      { id: "sync", label: "Data & Sync", icon: Database, keywords: "offline cloud backup storage queue health online" },
    ]
  },
  {
    title: "Extensions",
    tabs: [
      { id: "notifications", label: "Notifications", icon: Bell, keywords: "email whatsapp push alerts reports sms" },
      { id: "ai", label: "AI & Automation", icon: Sparkles, keywords: "smart forecasting prediction fraud behavior assistant" },
    ]
  },
  {
    title: "System",
    tabs: [
      { id: "appearance", label: "Appearance", icon: Palette, keywords: "dark mode colors compact theme dashboard" },
      { id: "advanced", label: "Advanced", icon: Code, keywords: "developer api cache diagnostics performance" },
    ]
  }
];

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          This enterprise module is currently under construction and will be available in the next major update.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Phase 1: Global Dirty State placeholder for Unsaved Changes UI
  // Real implementation will require lifting state or context from tabs.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter tabs based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return TAB_GROUPS;
    
    const query = searchQuery.toLowerCase();
    return TAB_GROUPS.map(group => ({
      ...group,
      tabs: group.tabs.filter(tab => 
        tab.label.toLowerCase().includes(query) || tab.keywords.includes(query)
      )
    })).filter(group => group.tabs.length > 0);
  }, [searchQuery]);

  // Auto-select first result on search
  useEffect(() => {
    if (searchQuery.trim() && filteredGroups.length > 0 && filteredGroups[0].tabs.length > 0) {
      setActiveTab(filteredGroups[0].tabs[0].id as SettingsTab);
    }
  }, [searchQuery, filteredGroups]);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-6 relative">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings Hub</h1>
          <p className="text-muted-foreground">Configure your enterprise POS preferences.</p>
        </div>
        
        {/* Global Settings Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search settings..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border/50 focus:border-primary/50 transition-all rounded-full"
          />
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Sticky Sidebar Tabs */}
        <div className="w-56 shrink-0 overflow-y-auto pr-4 pb-12 custom-scrollbar">
          <div className="space-y-6">
            {filteredGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {group.title}
                </h4>
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group ${
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-6 px-2">
                <p className="text-sm text-muted-foreground">No settings found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-4 pb-24 relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "receipts" && <ReceiptsTab />}
              {activeTab === "devices" && <DevicesTab />}
              {activeTab === "sync" && <SyncTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "payments" && <PaymentsTab />}
              {activeTab === "inventory" && <InventoryTab />}
              {activeTab === "customers" && <CustomersTab />}
              
              {/* New Module Placeholders */}
              {activeTab === "notifications" && <PlaceholderTab title="Notification Center" />}
              {activeTab === "ai" && <PlaceholderTab title="AI & Automation" />}
              {activeTab === "appearance" && <PlaceholderTab title="Appearance & Branding" />}
              {activeTab === "advanced" && <PlaceholderTab title="Advanced Diagnostics" />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Global Unsaved Changes Action Bar (Phase 1 Scaffold) */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between w-full max-w-lg bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-6 py-4"
          >
            <div>
              <p className="text-sm font-semibold">Unsaved changes</p>
              <p className="text-xs text-muted-foreground">You have modified settings that need to be saved.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setHasUnsavedChanges(false)}>Discard</Button>
              <Button size="sm" className="gap-2" onClick={() => setHasUnsavedChanges(false)}>
                <CheckCircle2 className="w-4 h-4" /> Save Changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
