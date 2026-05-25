"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import type { BusinessSettings, ReceiptTemplate } from "@/offline/db";
import type { ReceiptSettingsSnapshot } from "@/components/settings/receipts/receipt-types";
import { RECEIPT_DEFAULTS } from "@/components/settings/receipts/receipt-constants";
import { logActivity } from "@/lib/activityLogger";

// Extract all receipt-prefixed fields from the defaults to create the form shape
type ReceiptFormState = ReceiptSettingsSnapshot;

export function useReceiptSettings() {
  const { businessId, user } = useAuthStore();

  // ─── Supabase queries ───
  const [settings, setSettings] = useState<any>(undefined);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (businessId) {
      supabase.from("business_settings").select("*").eq("business_id", businessId).single().then(({ data }) => setSettings(data));
      supabase.from("receipt_templates").select("*").eq("business_id", businessId).then(({ data }) => setTemplates(data || []));
    }
  }, [businessId]);

  // ─── Form State ───
  const [form, setForm] = useState<ReceiptFormState>({ ...RECEIPT_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydrating = useRef(true);

  // Hydrate form from settings
  useEffect(() => {
    if (settings) {
      isHydrating.current = true;
      setForm(prev => {
        const next = { ...prev };
        // Copy all receipt_ fields from settings to form
        for (const key of Object.keys(RECEIPT_DEFAULTS) as (keyof ReceiptFormState)[]) {
          const val = (settings as any)[key];
          if (val !== undefined && val !== null) {
            (next as any)[key] = val;
          }
        }
        return next;
      });
    }
  }, [settings]);

  // ─── Auto-save with debounce ───
  const doSave = useCallback(async (data: ReceiptFormState) => {
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

      if (supabase) {
        await supabase.from("business_settings").upsert(record);
      }
      if (user?.id) {
        logActivity(businessId, user.id, "Receipt settings updated", {
          message: "Modified receipt customization settings.",
        });
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

  // User-initiated change helper
  const u = useCallback((patch: Partial<ReceiptFormState>) => {
    isHydrating.current = false;
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  // ─── Template CRUD ───
  const saveTemplate = useCallback(async (name: string, theme: ReceiptTemplate["theme"] = "default") => {
    if (!businessId) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const template: ReceiptTemplate = {
      id,
      name,
      business_id: businessId,
      is_default: templates.length === 0,
      theme,
      settings: { ...form },
      created_at: now,
      updated_at: now,
    };

    if (supabase) {
      await supabase.from("receipt_templates").upsert(template);
    }
    return template;
  }, [businessId, form, templates.length]);

  const duplicateTemplate = useCallback(async (templateId: string) => {
    const { data: original } = await supabase.from("receipt_templates").select("*").eq("id", templateId).single();
    if (!original || !businessId) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const duplicate: ReceiptTemplate = {
      ...original,
      id,
      name: `${original.name} (Copy)`,
      is_default: false,
      created_at: now,
      updated_at: now,
    };
    if (supabase) {
      await supabase.from("receipt_templates").upsert(duplicate);
    }
  }, [businessId]);

  const deleteTemplate = useCallback(async (templateId: string) => {

    if (supabase) {
      await supabase.from("receipt_templates").delete().eq("id", templateId);
    }
  }, []);

  const setDefaultTemplate = useCallback(async (templateId: string) => {
    if (!businessId) return;
    // Unmark all current defaults
    const { data: all } = await supabase.from("receipt_templates").select("*").eq("business_id", businessId);
    if (all) {
      for (const t of all) {
        if (t.is_default) {
          await supabase.from("receipt_templates").update({ is_default: false }).eq("id", t.id);
        }
      }
    }
    // Mark new default
    await supabase.from("receipt_templates").update({ is_default: true }).eq("id", templateId);
  }, [businessId]);

  const loadTemplate = useCallback((template: ReceiptTemplate) => {
    isHydrating.current = false;
    setForm(prev => ({ ...prev, ...template.settings }));
  }, []);

  const applyTheme = useCallback((themeOverrides: Partial<ReceiptFormState>) => {
    isHydrating.current = false;
    setForm(prev => ({ ...RECEIPT_DEFAULTS, ...prev, ...themeOverrides }));
  }, []);

  return {
    form,
    u,
    saving,
    saved,
    settings,
    templates,
    saveTemplate,
    duplicateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    loadTemplate,
    applyTheme,
  };
}
