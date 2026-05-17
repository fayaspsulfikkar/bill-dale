"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import db from "@/offline/db";
import type { Branch } from "@/offline/db";

/**
 * Syncs branches and inventory from Supabase into local Dexie on mount.
 * Safe to call on any dashboard page — it debounces to once per session.
 */
let syncedThisSession = false;

export function useDataSync() {
  const { businessId } = useAuthStore();

  useEffect(() => {
    if (!businessId || syncedThisSession || !supabase) return;

    const run = async () => {
      try {
        syncedThisSession = true;

        const client = supabase;
        if (!client) return;

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

      } catch (err) {
        // Silently fail — Dexie local data is the source of truth offline
        console.warn("[useDataSync] Sync failed (may be offline):", err);
        syncedThisSession = false; // allow retry
      }
    };

    run();
  }, [businessId]);
}
