import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useBranches(businessId: string | null) {
  return useQuery({
    queryKey: ["branches", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(b => {
        const contactParts = b.contact ? String(b.contact).split(" | ") : [];
        return {
          ...b,
          status: b.is_active ? "active" : "inactive",
          address: b.location || "",
          contact_person: contactParts[0] || "",
          phone: contactParts[1] || "",
          email: contactParts[2] || "",
        };
      });
    },
    enabled: !!businessId,
  });
}

export function useProducts(businessId: string | null) {
  return useQuery({
    queryKey: ["products", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useInventory(branchIds: string[] | null) {
  return useQuery({
    queryKey: ["inventory", branchIds],
    queryFn: async () => {
      if (!branchIds || branchIds.length === 0) return [];
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .in("branch_id", branchIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchIds && branchIds.length > 0,
  });
}

export function useCustomers(businessId: string | null) {
  return useQuery({
    queryKey: ["customers", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useInvoices(branchIds: string[] | null, limit = 200) {
  return useQuery({
    queryKey: ["invoices", branchIds, limit],
    queryFn: async () => {
      if (!branchIds || branchIds.length === 0) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .in("branch_id", branchIds)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchIds && branchIds.length > 0,
  });
}

export function useInvoiceItems(invoiceIds: string[] | null) {
  return useQuery({
    queryKey: ["invoice_items", invoiceIds],
    queryFn: async () => {
      if (!invoiceIds || invoiceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoiceIds && invoiceIds.length > 0,
  });
}

export function useStaffMembers(businessId: string | null) {
  return useQuery({
    queryKey: ["staff_members", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .eq("business_id", businessId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}
