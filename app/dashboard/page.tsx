"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useProducts, useInventory, useBranches, useInvoices, useInvoiceItems } from "@/lib/api/queries";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore } from "@/store/authStore";
import { BranchFilterChip } from "@/components/BranchFilterChip";
import { DateRangeFilter, getDateRange, type DateRange } from "@/components/dashboard/DateRangeFilter";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { RevenueSummary } from "@/components/dashboard/RevenueSummary";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { PeakHoursChart } from "@/components/dashboard/PeakHoursChart";
import { BranchComparison } from "@/components/dashboard/BranchComparison";
import { TopSellingProducts } from "@/components/dashboard/TopSellingProducts";
import { StaffPerformance } from "@/components/dashboard/StaffPerformance";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { PaymentBreakdown } from "@/components/dashboard/PaymentBreakdown";
import { HeldOrdersSummary } from "@/components/dashboard/HeldOrdersSummary";
import { CashRegisterStatus } from "@/components/dashboard/CashRegisterStatus";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { exportPDF, exportCSV } from "@/lib/exportDashboard";
import { parseISO, subDays, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useCurrencyVersion } from "@/components/CurrencyRefreshBoundary";

export default function DashboardOverview() {
  useCurrencyVersion(); // re-render on currency format change
  const { selectedBranchId } = usePOSStore();
  const { businessId, role, staffMode } = useAuthStore();
  const [filterBranchId, setFilterBranchId] = useState<string | "all">(selectedBranchId || "all");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange("today"));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (selectedBranchId && filterBranchId === "all") {
      setFilterBranchId(selectedBranchId);
    }
  }, [selectedBranchId]);

  // Data queries
  const { data: branches = [] } = useBranches(businessId || null);
  const branchIds = useMemo(() => branches.map(b => b.id), [branches]);
  const { data: allInvoices = [] } = useInvoices(branchIds);
  const invoiceIds = useMemo(() => allInvoices.map(i => i.id), [allInvoices]);
  const { data: invoiceItems = [] } = useInvoiceItems(invoiceIds);
  const { data: products = [] } = useProducts(businessId || null);
  const { data: inventory = [] } = useInventory(branchIds);

  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [returnOrders, setReturnOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    supabase.from('held_orders').select('*').eq('business_id', businessId).then(({ data }) => setHeldOrders(data || []));
    supabase.from('cash_registers').select('*').eq('business_id', businessId).then(({ data }) => setCashRegisters(data || []));
    supabase.from('return_orders').select('*').eq('business_id', businessId).then(({ data }) => setReturnOrders(data || []));
  }, [businessId]);

  // Filter invoices by branch
  const branchInvoices = useMemo(() => {
    if (filterBranchId === "all") return allInvoices;
    return allInvoices.filter(i => i.branch_id === filterBranchId);
  }, [allInvoices, filterBranchId]);

  // Filter by date range
  const invoicesInRange = useMemo(() => {
    return branchInvoices.filter(i => {
      const d = parseISO(i.created_at);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [branchInvoices, dateRange]);

  // Previous period for comparison
  const prevInvoices = useMemo(() => {
    const rangeDays = differenceInDays(dateRange.to, dateRange.from) + 1;
    const prevFrom = startOfDay(subDays(dateRange.from, rangeDays));
    const prevTo = endOfDay(subDays(dateRange.from, 1));
    return branchInvoices.filter(i => {
      const d = parseISO(i.created_at);
      return d >= prevFrom && d <= prevTo;
    });
  }, [branchInvoices, dateRange]);

  // Filter returns by date range and branch
  const returnsInRange = useMemo(() => {
    return returnOrders.filter(r => {
      const d = parseISO(r.created_at);
      const inRange = d >= dateRange.from && d <= dateRange.to;
      const inBranch = filterBranchId === "all" || r.branch_id === filterBranchId;
      return inRange && inBranch;
    });
  }, [returnOrders, dateRange, filterBranchId]);

  // Filter held orders by branch
  const filteredHeldOrders = useMemo(() => {
    if (filterBranchId === "all") return heldOrders;
    return heldOrders.filter(o => o.branch_id === filterBranchId);
  }, [heldOrders, filterBranchId]);

  // Active cash register
  const activeCashRegister = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const branchId = filterBranchId === "all" ? selectedBranchId : filterBranchId;
    if (!branchId) return null;
    return cashRegisters.find(r => r.branch_id === branchId && r.date === today) || null;
  }, [cashRegisters, filterBranchId, selectedBranchId]);

  // Export handler
  const handleExport = async (type: "pdf" | "csv") => {
    setExporting(true);
    try {
      const businessName = useAuthStore.getState().businessName || "BillDale";
      const branchLabel = filterBranchId === "all" ? "All Branches" : branches.find(b => b.id === filterBranchId)?.name || "Unknown";
      const exportData = {
        invoices: invoicesInRange,
        invoiceItems,
        products,
        branches,
        returnOrders: returnsInRange,
        dateRange,
        businessName,
        branchLabel,
      };
      if (type === "csv") {
        exportCSV(exportData);
      } else {
        await exportPDF(exportData);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Business performance dashboard</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border/50 bg-card/50 hover:bg-card/80 transition-all text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting…" : "Export"}
            </button>
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block w-48 rounded-xl border border-border/60 bg-card shadow-xl p-1.5 space-y-0.5">
              <button
                onClick={() => handleExport("pdf")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <div className="text-left">
                  <p className="font-semibold">PDF Report</p>
                  <p className="text-[10px] text-muted-foreground">Branded, multi-section</p>
                </div>
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                <div className="text-left">
                  <p className="font-semibold">CSV Spreadsheet</p>
                  <p className="text-[10px] text-muted-foreground">Excel-compatible data</p>
                </div>
              </button>
            </div>
          </div>

          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <BranchFilterChip value={filterBranchId} onChange={setFilterBranchId} />
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards
        invoices={invoicesInRange}
        prevInvoices={prevInvoices}
        invoiceItems={invoiceItems}
        products={products}
        inventory={inventory}
        heldOrders={filteredHeldOrders}
        branchId={filterBranchId}
      />

      {/* Sales Trend (full width) */}
      <SalesTrendChart invoices={invoicesInRange} dateRange={dateRange} />

      {/* Revenue Summary + Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueSummary invoices={invoicesInRange} invoiceItems={invoiceItems} returnOrders={returnsInRange} />
        <PaymentBreakdown invoices={invoicesInRange} />
      </div>

      {/* Charts: Branch Comparison + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BranchComparison invoices={invoicesInRange} branches={branches} />
        <PeakHoursChart invoices={invoicesInRange} />
      </div>

      {/* Top Selling Products (full width) */}
      <TopSellingProducts
        invoices={invoicesInRange}
        invoiceItems={invoiceItems}
        products={products}
        inventory={inventory}
        branchId={filterBranchId}
      />

      {/* Staff Sales Tracking */}
      <StaffPerformance invoices={invoicesInRange} />

      {/* Bottom row: Low Stock + Held Orders + Cash Register + Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <LowStockAlerts products={products} inventory={inventory} branches={branches} branchId={filterBranchId} />
        <HeldOrdersSummary heldOrders={filteredHeldOrders} />
        <CashRegisterStatus register={activeCashRegister} />
        <DashboardInsights
          invoices={invoicesInRange}
          invoiceItems={invoiceItems}
          products={products}
          inventory={inventory}
          branches={branches}
          returnOrders={returnsInRange}
          branchId={filterBranchId}
        />
      </div>
    </div>
  );
}
