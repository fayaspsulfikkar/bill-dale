"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import type { Branch } from "@/offline/db";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncedThisSession = false;

async function pushSyncQueue() {
  const client = supabase;
  if (!client) return;

  const queueItems = await db.sync_queue.toArray();
  if (queueItems.length === 0) return;

  console.log(`[useDataSync] Found ${queueItems.length} items in sync queue. Starting upload...`);

  for (const item of queueItems) {
    try {
      let success = false;
      const { table_name, operation, data } = item;

      if (operation === "INSERT" || operation === "UPDATE") {
        // Strip the local 'synced' flag before uploading to Supabase
        const payload = { ...data };
        delete (payload as any).synced;

        const { error } = await client
          .from(table_name)
          .upsert(payload as any);

        if (error) {
          console.error(`[useDataSync] Failed to upsert to ${table_name}:`, error);
          toast.error(`Sync failed for ${table_name}: ${error.message}`, {
            duration: 60000, // 60 seconds
            id: `sync-err-${table_name}`, // Deduplicate
          });
        } else {
          success = true;
        }
      } else if (operation === "DELETE") {
        const id = (data as any)?.id;
        if (id) {
          const { error } = await client
            .from(table_name)
            .delete()
            .eq("id", id);

          if (error) {
            console.error(`[useDataSync] Failed to delete from ${table_name}:`, error);
          } else {
            success = true;
          }
        } else {
          success = true; // Mark as processed to remove corrupt/invalid item from local queue
        }
      }

      if (success && item.id !== undefined) {
        await db.sync_queue.delete(item.id);
      }
    } catch (err) {
      console.error(`[useDataSync] Error processing queue item ${item.id}:`, err);
    }
  }
}

async function runSync(businessId: string) {
  const client = supabase;
  if (!client) return;

  // Push local changes to Supabase first
  try {
    await pushSyncQueue();
  } catch (pushErr) {
    console.error("[useDataSync] Failed to push local changes to Supabase:", pushErr);
  }

  // Sync branches
  const { data: branches } = await client
    .from("branches")
    .select("id, name, branch_code, address, contact_person, phone, email, status, opening_date")
    .order("created_at", { ascending: true });

  if (branches && branches.length > 0) {
    await db.branches.bulkPut(branches as Branch[]);
  }

  // Sync inventory for this business's branches
  if (branches && branches.length > 0) {
    const branchIds = branches.map((b: any) => b.id);
    const { data: inventory } = await client
      .from("inventory")
      .select("id, product_id, branch_id, stock, last_updated")
      .in("branch_id", branchIds);

    if (inventory && inventory.length > 0) {
      await db.inventory.bulkPut(inventory as any[]);
    }
  }

  // Sync products
  const { data: products } = await client
    .from("products")
    .select("*");

  if (products && products.length > 0) {
    await db.products.bulkPut(products as any[]);
  }

  // Sync customers
  const { data: customers } = await client
    .from("customers")
    .select("*");

  if (customers && customers.length > 0) {
    await db.customers.bulkPut(customers as any[]);
  }

  // Sync recent invoices for this business's branches (limit 200 to keep local DB fast)
  if (branches && branches.length > 0) {
    const branchIds = branches.map((b: any) => b.id);
    const { data: invoices } = await client
      .from("invoices")
      .select("*")
      .in("branch_id", branchIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (invoices && invoices.length > 0) {
      await db.invoices.bulkPut(invoices as any[]);

      // Sync items for these invoices
      const invoiceIds = invoices.map((inv: any) => inv.id);
      
      // Supabase `.in` filter has a limit on array length (typically around 1000 items)
      // But since we limited invoices to 200, 200 IDs is well within the limit.
      const { data: invoiceItems } = await client
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds);

      if (invoiceItems && invoiceItems.length > 0) {
        await db.invoice_items.bulkPut(invoiceItems as any[]);
      }
    }
  }

  // Sync business_settings
  const { data: settings } = await client
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (settings) {
    await db.business_settings.put(settings as any);
  }

  // Record the last sync time
  if (typeof window !== "undefined") {
    localStorage.setItem("lastSyncedAt", new Date().toISOString());
  }
}

export function useDataSync() {
  const { businessId } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastSyncedAt(localStorage.getItem("lastSyncedAt"));
    }
  }, []);

  const sync = useCallback(async () => {
    if (!businessId || !supabase || isSyncing) return;
    setIsSyncing(true);
    try {
      await runSync(businessId);
      syncedThisSession = true;
      const now = new Date().toISOString();
      setLastSyncedAt(now);
    } catch (err) {
      console.warn("[useDataSync] Sync failed (may be offline):", err);
    } finally {
      setIsSyncing(false);
    }
  }, [businessId, isSyncing]);

  // Initial sync on mount
  useEffect(() => {
    if (!businessId || syncedThisSession || !supabase) return;
    sync();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic auto-sync every 5 minutes
  useEffect(() => {
    if (!businessId || !supabase) return;

    intervalRef.current = setInterval(() => {
      sync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const forceSync = useCallback(async () => {
    syncedThisSession = false;
    await sync();
  }, [sync]);

  return { isSyncing, lastSyncedAt, forceSync };
}
