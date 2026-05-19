"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { DateRangeFilter, getDateRange, type DateRange } from "@/components/dashboard/DateRangeFilter";
import {
  Activity, Search, X, UserPlus, UserMinus, UserCheck, UserX, Pencil,
  ArrowRightLeft, ShoppingCart, Package, BarChart3, Download,
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";

type Severity = "info" | "success" | "warning" | "danger";

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string; severity: Severity }> = {
  business_created: { label: "Business Created", icon: BarChart3, color: "text-primary", severity: "info" },
  user_login: { label: "User Login", icon: UserCheck, color: "text-blue-400", severity: "info" },
  invoice_created: { label: "Invoice Created", icon: ShoppingCart, color: "text-green-400", severity: "success" },
  product_added: { label: "Product Added", icon: Package, color: "text-purple-400", severity: "success" },
  stock_updated: { label: "Stock Updated", icon: Package, color: "text-amber-400", severity: "warning" },
  staff_invited: { label: "Staff Invited", icon: UserPlus, color: "text-blue-400", severity: "info" },
  staff_joined: { label: "Staff Joined", icon: UserCheck, color: "text-green-400", severity: "success" },
  staff_added: { label: "Staff Added", icon: UserPlus, color: "text-green-400", severity: "success" },
  staff_edited: { label: "Staff Edited", icon: Pencil, color: "text-blue-400", severity: "info" },
  staff_deactivated: { label: "Staff Deactivated", icon: UserMinus, color: "text-amber-400", severity: "danger" },
  staff_activated: { label: "Staff Activated", icon: UserCheck, color: "text-green-400", severity: "success" },
  staff_deleted: { label: "Staff Removed", icon: UserX, color: "text-red-400", severity: "danger" },
  staff_transferred: { label: "Staff Transferred", icon: ArrowRightLeft, color: "text-purple-400", severity: "info" },
};

const SEVERITY_BG: Record<Severity, string> = {
  info: "",
  success: "bg-green-500/5",
  warning: "bg-amber-500/5",
  danger: "bg-red-500/5",
};

type FilterType = "all" | "staff" | "sales" | "inventory";

const STAFF_ACTIONS = ["staff_added", "staff_edited", "staff_deactivated", "staff_activated", "staff_deleted", "staff_transferred", "staff_invited", "staff_joined"];
const SALES_ACTIONS = ["invoice_created"];
const INVENTORY_ACTIONS = ["product_added", "stock_updated"];

export default function ActivityPage() {
  const { businessId } = useAuthStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange("30days"));
  const [filterBranchId, setFilterBranchId] = useState<string | "all">("all");

  const logs = useLiveQuery(
    () => businessId
      ? db.activity_logs.where("business_id").equals(businessId).reverse().sortBy("created_at")
      : [],
    [businessId]
  );

  const branches = useLiveQuery(() => db.branches.toArray(), []);

  const filteredLogs = useMemo(() => {
    let list = logs || [];

    // Date range filter
    list = list.filter(l => {
      const d = parseISO(l.created_at);
      return d >= dateRange.from && d <= dateRange.to;
    });

    // Branch filter
    if (filterBranchId !== "all") {
      list = list.filter(l => {
        const details = l.details || {};
        const branchIds = details.branches || details.branch_id || details.branch_ids;
        if (Array.isArray(branchIds)) return branchIds.includes(filterBranchId);
        if (typeof branchIds === "string") return branchIds === filterBranchId;
        return true; // show logs without branch info in all filters
      });
    }

    // Category filter
    if (filter === "staff") list = list.filter(l => STAFF_ACTIONS.includes(l.action));
    if (filter === "sales") list = list.filter(l => SALES_ACTIONS.includes(l.action));
    if (filter === "inventory") list = list.filter(l => INVENTORY_ACTIONS.includes(l.action));

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(l =>
        (ACTION_META[l.action]?.label || l.action).toLowerCase().includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, filter, search, dateRange, filterBranchId]);

  const filterCounts = useMemo(() => {
    const all = logs || [];
    return {
      all: all.length,
      staff: all.filter(l => STAFF_ACTIONS.includes(l.action)).length,
      sales: all.filter(l => SALES_ACTIONS.includes(l.action)).length,
      inventory: all.filter(l => INVENTORY_ACTIONS.includes(l.action)).length,
    };
  }, [logs]);

  const formatDetails = (details?: Record<string, unknown>): string | null => {
    if (!details || Object.keys(details).length === 0) return null;
    const parts: string[] = [];
    if (details.staff_name) parts.push(`Staff: ${details.staff_name}`);
    if (details.role) parts.push(`Role: ${details.role}`);
    if (details.branches) parts.push(`Branches: ${(details.branches as string[]).join(", ")}`);
    if (parts.length === 0) {
      return Object.entries(details)
        .filter(([k]) => k !== "actor_name")
        .map(([k, v]) => `${k}: ${v}`).join(" · ");
    }
    return parts.join(" · ");
  };

  const exportCSV = useCallback(() => {
    const rows = [["Date", "Time", "Action", "Details", "Actor"]];
    filteredLogs.forEach(log => {
      const meta = ACTION_META[log.action];
      const details = log.details || {};
      rows.push([
        format(new Date(log.created_at), "yyyy-MM-dd"),
        format(new Date(log.created_at), "hh:mm a"),
        meta?.label || log.action,
        formatDetails(details) || "",
        (details.actor_name as string) || "",
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  return (
    <RoleGuard adminOnly>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground">Audit trail of all actions in your business account.</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 shrink-0">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Date Range + Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Branches</option>
            {(branches || []).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Search + Category Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activity…"
              className="pl-9 h-10 bg-card/50 border-border/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "staff", "sales", "inventory"] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card/80 hover:text-foreground"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
              </button>
            ))}
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" /> Recent Activity
              <span className="text-muted-foreground font-normal text-sm ml-1">({filteredLogs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>{search || filter !== "all" ? "No activity matches your filters." : "No activity recorded yet."}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => {
                  const meta = ACTION_META[log.action];
                  const Icon = meta?.icon || Activity;
                  const color = meta?.color || "text-muted-foreground";
                  const severity = meta?.severity || "info";
                  const detailStr = formatDetails(log.details);
                  const actorName = (log.details?.actor_name as string) || null;

                  return (
                    <div key={log.id} className={`flex items-start gap-3 p-3 rounded-xl hover:bg-muted/20 transition-colors group ${SEVERITY_BG[severity]}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color} bg-current/10`} style={{ backgroundColor: 'transparent' }}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {meta?.label ?? log.action}
                        </p>
                        {detailStr && (
                          <p className="text-xs text-muted-foreground mt-0.5">{detailStr}</p>
                        )}
                        {actorName && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1">by {actorName}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {format(new Date(log.created_at), "hh:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
