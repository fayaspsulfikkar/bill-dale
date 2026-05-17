"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
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
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { PaymentBreakdown } from "@/components/dashboard/PaymentBreakdown";
import { HeldOrdersSummary } from "@/components/dashboard/HeldOrdersSummary";
import { CashRegisterStatus } from "@/components/dashboard/CashRegisterStatus";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { formatINR } from "@/lib/formatCurrency";
import { parseISO, subDays, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { Download } from "lucide-react";

export default function DashboardOverview() {
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
  const allInvoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const invoiceItems = useLiveQuery(() => db.invoice_items.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const branches = useLiveQuery(() => db.branches.toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.toArray()) || [];
  const heldOrders = useLiveQuery(() => db.held_orders.toArray()) || [];
  const cashRegisters = useLiveQuery(() => db.cash_registers.toArray()) || [];
  const returnOrders = useLiveQuery(() => db.return_orders.toArray()) || [];

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
      if (type === "csv") {
        const headers = ["Invoice #", "Date", "Amount", "Tax", "Discount", "Payment", "Branch"];
        const rows = invoicesInRange.map(i => {
          const branch = branches.find(b => b.id === i.branch_id);
          return [
            i.invoice_number || i.id.slice(0, 8),
            i.created_at,
            i.total_amount.toFixed(2),
            (i.tax_amount || 0).toFixed(2),
            (i.discount || 0).toFixed(2),
            i.payment_method,
            branch?.name || "",
          ].join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-export-${dateRange.label.replace(/\s/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Dashboard Report", 14, 20);
        doc.setFontSize(10);
        doc.text(`Period: ${dateRange.label}`, 14, 28);
        doc.text(`Total Revenue: ${formatINR(invoicesInRange.reduce((s, i) => s + i.total_amount, 0))}`, 14, 34);
        doc.text(`Total Orders: ${invoicesInRange.length}`, 14, 40);

        autoTable(doc, {
          startY: 48,
          head: [["Invoice #", "Date", "Amount", "Tax", "Discount", "Payment"]],
          body: invoicesInRange.slice(0, 50).map(i => [
            i.invoice_number || i.id.slice(0, 8),
            new Date(i.created_at).toLocaleDateString("en-IN"),
            `₹${i.total_amount.toFixed(2)}`,
            `₹${(i.tax_amount || 0).toFixed(2)}`,
            `₹${(i.discount || 0).toFixed(2)}`,
            i.payment_method.toUpperCase(),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [99, 102, 241] },
        });
        doc.save(`dashboard-report-${dateRange.label.replace(/\s/g, "_")}.pdf`);
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
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border/50 bg-card/50 hover:bg-card/80 transition-all text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting…" : "Export"}
            </button>
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block w-28 rounded-xl border border-border/60 bg-card shadow-xl p-1">
              <button onClick={() => handleExport("csv")} className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-muted/50">CSV</button>
              <button onClick={() => handleExport("pdf")} className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-muted/50">PDF</button>
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
