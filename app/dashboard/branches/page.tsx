"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useBranches, useInvoices, useInventory, useProducts, useStaffMembers } from "@/lib/api/queries";
import type { Branch } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { formatINR } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MapPin, Plus, Search, MoreVertical, Building2, TrendingUp, Users, AlertTriangle, Eye, Pencil, PowerOff, Archive, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrencyVersion } from "@/components/CurrencyRefreshBoundary";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-600 border-green-500/30",
  inactive: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  temporarily_closed: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  under_maintenance: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  archived: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function BranchesPage() {
  useCurrencyVersion();
  const router = useRouter();
  
  // Data
  const { user, businessId } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useBranches(businessId || null);
  const branchIds = useMemo(() => branches.map((b: Branch) => b.id), [branches]);
  const { data: invoices = [] } = useInvoices(branchIds);
  const { data: staff = [] } = useStaffMembers(businessId || null);
  const { data: inventory = [] } = useInventory(branchIds);
  const { data: products = [] } = useProducts(businessId || null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({});

  // Computed Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = todayStr.slice(0, 7);

  const kpis = useMemo(() => {
    let active = 0;
    let todaySales = 0;
    let monthlySales = 0;
    const branchSales: Record<string, number> = {};
    const lowStockBranchIds = new Set<string>();

    branches.forEach(b => {
      if (b.status === "active") active++;
    });

    invoices.forEach(inv => {
      const isToday = inv.created_at.startsWith(todayStr);
      const isThisMonth = inv.created_at.startsWith(thisMonthStr);
      
      if (isToday) todaySales += inv.total_amount;
      if (isThisMonth) {
        monthlySales += inv.total_amount;
        branchSales[inv.branch_id] = (branchSales[inv.branch_id] || 0) + inv.total_amount;
      }
    });

    // Check low stock
    inventory.forEach(inv => {
      const prod = products.find(p => p.id === inv.product_id);
      if (prod && inv.stock <= (prod.low_stock_threshold || 5)) {
        lowStockBranchIds.add(inv.branch_id);
      }
    });

    let bestBranchId = "";
    let maxSales = -1;
    Object.entries(branchSales).forEach(([id, sales]) => {
      if (sales > maxSales) {
        maxSales = sales;
        bestBranchId = id;
      }
    });
    const bestBranchName = branches.find(b => b.id === bestBranchId)?.name || "N/A";

    return {
      total: branches.filter(b => b.status !== "archived").length,
      active,
      todaySales,
      monthlySales,
      lowStockBranches: lowStockBranchIds.size,
      bestBranchName,
    };
  }, [branches, invoices, inventory, products, todayStr, thisMonthStr]);

  // Table Data (computed per branch)
  const branchTableData = useMemo(() => {
    return branches.map(b => {
      let bToday = 0;
      let bMonth = 0;
      invoices.forEach(inv => {
        if (inv.branch_id === b.id) {
          if (inv.created_at.startsWith(todayStr)) bToday += inv.total_amount;
          if (inv.created_at.startsWith(thisMonthStr)) bMonth += inv.total_amount;
        }
      });
      const staffCount = staff.filter(s => s.branch_ids?.includes(b.id)).length;
      return { ...b, todaySales: bToday, monthlySales: bMonth, staffCount };
    });
  }, [branches, invoices, staff, todayStr, thisMonthStr]);

  // Filtered
  const filteredBranches = useMemo(() => {
    let list = branchTableData;
    if (statusFilter !== "all") {
      list = list.filter(b => b.status === statusFilter);
    } else {
      list = list.filter(b => b.status !== "archived"); // Hide archived by default
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) || 
        (b.branch_code || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [branchTableData, statusFilter, search]);

  // Handlers
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) return;

    if (editingBranch) {
      const dbUpdated = {
        name: formData.name,
        location: formData.address,
        branch_code: formData.branch_code,
        contact: [formData.contact_person, formData.phone, formData.email].filter(Boolean).join(" | "),
        is_active: formData.status === "active",
      };
      const { error } = await supabase.from('branches').update(dbUpdated).eq('id', editingBranch.id);
      if (error) {
        alert("Failed to update branch: " + error.message);
        return;
      }
    } else {
      if (!businessId) return;
      const dbBranch = {
        id: crypto.randomUUID(),
        business_id: businessId,
        name: formData.name,
        location: formData.address,
        branch_code: formData.branch_code,
        contact: [formData.contact_person, formData.phone, formData.email].filter(Boolean).join(" | "),
        is_active: formData.status === "active",
      };
      const { error } = await supabase.from('branches').insert(dbBranch);
      if (error) {
        alert("Failed to create branch: " + error.message);
        return;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    setIsAddOpen(false);
    setIsEditOpen(false);
    setFormData({});
  };

  const handleAction = async (action: string, branch: Branch) => {
    switch (action) {
      case "view":
        router.push(`/dashboard/branches/${branch.id}`);
        break;
      case "edit":
        setEditingBranch(branch);
        setFormData(branch);
        setIsEditOpen(true);
        break;
      case "toggle":
        await supabase.from('branches').update({ 
          status: branch.status === "active" ? "inactive" : "active" 
        }).eq('id', branch.id);
        queryClient.invalidateQueries({ queryKey: ["branches"] });
        break;
      case "archive":
        if (confirm(`Are you sure you want to archive ${branch.name}? It will be hidden from normal views but history is kept.`)) {
          await supabase.from('branches').update({ status: "archived" }).eq('id', branch.id);
          queryClient.invalidateQueries({ queryKey: ["branches"] });
        }
        break;
    }
  };

  const statusOptions = ["all", "active", "inactive", "temporarily_closed", "under_maintenance", "archived"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground">Monitor and manage all your retail locations.</p>
        </div>
        <Button onClick={() => { setFormData({ status: "active" }); setIsAddOpen(true); }} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Branch
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Total Branches</p>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Active</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-2xl font-bold">{kpis.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Today's Sales</p>
            <p className="text-xl font-bold font-mono text-blue-600">{formatINR(kpis.todaySales)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Monthly Rev</p>
            <p className="text-xl font-bold font-mono text-indigo-600">{formatINR(kpis.monthlySales)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Low Stock Locs</p>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${kpis.lowStockBranches > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <p className="text-xl font-bold">{kpis.lowStockBranches}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Top Branch</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold truncate">{kpis.bestBranchName}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search branches..." 
            className="pl-9 h-10 bg-card/50 border-border/50" 
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card/80 hover:text-foreground"
              }`}
            >
              {s.replace(/_/g, " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[250px]">Branch Details</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead className="text-right">Sales Today</TableHead>
              <TableHead className="text-right">Monthly Rev</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBranches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-8 h-8 opacity-20" />
                    <p>No branches found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBranches.map(branch => (
                <TableRow key={branch.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-semibold">{branch.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {branch.branch_code && <span className="font-mono bg-muted px-1 rounded">{branch.branch_code}</span>}
                      <span className="truncate max-w-[200px]">{branch.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{branch.contact_person || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{branch.phone || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[branch.status] || ""}`}>
                      {branch.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-sm">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      {branch.staffCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-sm">
                    {formatINR(branch.todaySales)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-sm">
                    {formatINR(branch.monthlySales)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-border bg-card">
                        <DropdownMenuItem onClick={() => handleAction("view", branch)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2 text-primary" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("edit", branch)} className="cursor-pointer">
                          <Pencil className="w-4 h-4 mr-2 text-blue-500" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("toggle", branch)} className="cursor-pointer">
                          <PowerOff className="w-4 h-4 mr-2 text-amber-500" /> Toggle Status
                        </DropdownMenuItem>
                        {branch.status !== "archived" && (
                          <DropdownMenuItem onClick={() => handleAction("archive", branch)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Archive className="w-4 h-4 mr-2" /> Archive Branch
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); setIsEditOpen(false); setEditingBranch(null); }
      }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBranch} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Branch Name *</Label>
                <Input required value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Downtown Sneaker Hub" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input value={formData.branch_code || ""} onChange={e => setFormData({...formData, branch_code: e.target.value.toUpperCase()})} placeholder="e.g. BR-001" className="bg-background/50 font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.status || "active"}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="temporarily_closed">Temporarily Closed</option>
                  <option value="under_maintenance">Under Maintenance</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Full Address *</Label>
                <Input required value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Main St, City, State, ZIP" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formData.contact_person || ""} onChange={e => setFormData({...formData, contact_person: e.target.value})} placeholder="Manager Name" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="branch@example.com" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Opening Date</Label>
                <Input type="date" value={formData.opening_date || ""} onChange={e => setFormData({...formData, opening_date: e.target.value})} className="bg-background/50" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="px-8 shadow-sm">{isEditOpen ? "Save Changes" : "Create Branch"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
