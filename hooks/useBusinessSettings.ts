"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import type { BusinessSettings } from "@/offline/db";

// Base defaults to prevent React uncontrolled component warnings
export const BUSINESS_SETTINGS_DEFAULTS: Partial<BusinessSettings> = {
  // Currency & Formatting
  currency_code: "INR",
  currency_symbol: "₹",
  date_format: "DD/MM/YYYY",
  time_format: "12h",
  decimal_places: 2,
  // Tax & Invoicing
  default_gst_rate: 18,
  invoice_prefix: "INV-",
  invoice_start_number: 1,
  invoice_number_padding: 4,
  invoice_reset_cycle: "never",
  tax_inclusive_pricing: false,
  return_invoice_templates: false,
  // POS Behavior
  default_payment_method: "cash",
  pos_quick_add: true,
  pos_sound_effects: true,
  staff_mode_default_minutes: 10,
  low_stock_threshold: 10,
  barcode_format: "ean13",
  pos_auto_cart_recovery: true,
  pos_auto_print_receipt: true,
  pos_barcode_autofocus: true,
  pos_session_persistence: true,
  // Business Hours
  business_hours_open: "09:00",
  business_hours_close: "21:00",
  business_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
  business_timezone: "Asia/Kolkata",
  business_multi_branch_enabled: false,
  business_multi_language: "en",
  // Notifications
  notify_low_stock: true,
  notify_daily_summary: true,
  notify_sync_failures: true,
  
  // Phase 4.1 Users & Staff
  staff_management_enabled: false,
  staff_attendance_tracking: false,
  staff_performance_metrics: false,
  staff_shift_management: false,
  
  // Phase 4.1 Payments
  payment_allow_split: true,
  payment_allow_tips: false,
  payment_auto_refunds: false,

  // Phase 4.1 Inventory Rules
  inventory_expiry_tracking: false,
  inventory_batch_tracking: false,
  inventory_auto_reorder: false,
  inventory_sku_generation_format: "PREFIX-0000",
  inventory_barcode_generation: "ean13",

  // Phase 4.1 Customers & Loyalty
  loyalty_program_enabled: false,
  loyalty_points_per_currency: 1,
  loyalty_min_redemption_points: 100,
  loyalty_enable_store_credits: true,
  loyalty_enable_referrals: false,

  // Sync / Data
  sync_auto_sync_interval: 5,
  sync_conflict_resolution: "server_wins",
  sync_background_sync_enabled: true,
  sync_retry_attempts: 3,
};

export function useBusinessSettings() {
  const { businessId } = useAuthStore();

  const settings = useLiveQuery(
    () => businessId ? db.business_settings.where("business_id").equals(businessId).first() : undefined,
    [businessId]
  );

  const [form, setForm] = useState<Partial<BusinessSettings>>({ ...BUSINESS_SETTINGS_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydrating = useRef(true); // true = form update came from settings, not user

  useEffect(() => {
    if (settings) {
      isHydrating.current = true;
      setForm(prev => {
        const next = { ...prev };
        for (const key of Object.keys(BUSINESS_SETTINGS_DEFAULTS) as (keyof BusinessSettings)[]) {
          const val = (settings as any)[key];
          if (val !== undefined && val !== null) {
            (next as any)[key] = val;
          }
        }
        return next;
      });
    }
  }, [settings]);

  const doSave = useCallback(async (data: Partial<BusinessSettings>) => {
    if (!businessId) return;
    setSaving(true);
    try {
      const record = {
        id: settings?.id || crypto.randomUUID(),
        business_id: businessId,
        ...(settings || {}),
        ...data,
        updated_at: new Date().toISOString(),
      } as any;
      
      await db.business_settings.put(record);
      
      if (supabase) {
        await supabase.from("business_settings").upsert(record);
      }
      
      // Update global format currency cache
      if (data.currency_code !== undefined && data.decimal_places !== undefined) {
        const { invalidateCurrencyCache } = await import("@/lib/formatCurrency");
        invalidateCurrencyCache(data.currency_code, data.decimal_places);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, settings?.id]);

  useEffect(() => {
    if (isHydrating.current) {
      isHydrating.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(form), 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const u = useCallback((patch: Partial<BusinessSettings>) => {
    isHydrating.current = false;
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  return { form, u, saving, saved, settings };
}
