"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { formatINR } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Calendar, Users, Package, ArrowRightLeft, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-600 border-green-500/30",
  inactive: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  temporarily_closed: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  under_maintenance: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  archived: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function BranchProfilePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  const branch = useLiveQuery(() => db.branches.get(branchId), [branchId]);
  const invoices = useLiveQuery(() => db.invoices.where("branch_id").equals(branchId).toArray(), [branchId]) || [];
  const staff = useLiveQuery(() => db.staff_members.toArray()) || [];
  const inventory = useLiveQuery(() => db.inventory.where("branch_id").equals(branchId).toArray(), [branchId]) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  // Stock transfers where this branch is source OR destination
  const transfers = useLiveQuery(async () => {
    return await db.stock_transfers
      .filter(t => t.source_branch_id === branchId || t.dest_branch_id === branchId)
      .toArray();
  }, [branchId]) || [];

  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);

  const branchStaff = useMemo(() => {
    return staff.filter(s => s.branch_ids && s.branch_ids.includes(branchId));
  }, [staff, branchId]);

  const toggleStaffAssignment = async (staffMember: any) => {
    const currentIds = staffMember.branch_ids || [];
    const isAssigned = currentIds.includes(branchId);
    let newIds = [];
    
    if (isAssigned) {
      newIds = currentIds.filter((id: string) => id !== branchId);
    } else {
      newIds = [...currentIds, branchId];
    }
    
    await db.staff_members.update(staffMember.id, { branch_ids: newIds });
  };

  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const thisMonthStr = todayStr.slice(0, 7);
    
    let todaySales = 0;
    let monthlySales = 0;
    
    invoices.forEach(inv => {
      if (inv.created_at.startsWith(todayStr)) todaySales += inv.total_amount;
      if (inv.created_at.startsWith(thisMonthStr)) monthlySales += inv.total_amount;
    });
    
    let lowStock = 0;
    inventory.forEach(inv => {
      const prod = products.find(p => p.id === inv.product_id);
      if (prod && inv.stock <= (prod.low_stock_threshold || 5)) lowStock++;
    });

    return { todaySales, monthlySales, totalOrders: invoices.length, lowStock };
  }, [invoices, inventory, products]);

  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading branch profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/branches")} className="shrink-0 mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{branch.name}</h1>
            {branch.branch_code && (
              <Badge variant="outline" className="font-mono text-sm uppercase bg-muted/50">{branch.branch_code}</Badge>
            )}
            <Badge variant="outline" className={`capitalize ml-2 ${STATUS_COLORS[branch.status] || ""}`}>
              {branch.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {branch.address || "No address provided"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-card border border-border/50 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Building2 className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Users className="w-4 h-4" /> Staff ({branchStaff.length})</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Package className="w-4 h-4" /> Inventory</TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><ArrowRightLeft className="w-4 h-4" /> Stock Transfers</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Today's Sales</p>
                <p className="text-2xl font-bold font-mono text-blue-600">{formatINR(kpis.todaySales)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Monthly Revenue</p>
                <p className="text-2xl font-bold font-mono text-indigo-600">{formatINR(kpis.monthlySales)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Total Orders</p>
                <p className="text-2xl font-bold">{kpis.totalOrders}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 shadow-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Low Stock Items</p>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${kpis.lowStock > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <p className="text-2xl font-bold">{kpis.lowStock}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Contact Person</p>
                    <p className="text-sm text-muted-foreground">{branch.contact_person || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{branch.phone || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{branch.email || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Opening Date</p>
                    <p className="text-sm text-muted-foreground">
                      {branch.opening_date ? format(new Date(branch.opening_date), "PP") : "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <TrendingUp className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Detailed charts will appear here as data accumulates.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-4 outline-none">
          <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Staff members who have access to this branch.</p>
              <Button size="sm" onClick={() => setIsAssignStaffOpen(true)}>Manage Staff</Button>
            </div>
            {branchStaff.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No staff assigned to this branch yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {branchStaff.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {s.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-semibold text-primary/80">{s.role_title}</span>
                          {s.phone && <span>• {s.phone}</span>}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={s.is_active ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-muted-foreground"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-4 outline-none">
           <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Current stock levels at this location.</p>
            </div>
            {inventory.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No inventory recorded for this branch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4 gap-3">
                {inventory.map(inv => {
                  const prod = products.find(p => p.id === inv.product_id);
                  if (!prod) return null;
                  const isLow = inv.stock <= (prod.low_stock_threshold || 5);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">{prod.category} • {prod.size}</p>
                      </div>
                      <div className={`shrink-0 ml-3 text-right ${isLow ? 'text-amber-500 font-bold' : ''}`}>
                        <p className="text-sm">{inv.stock} in stock</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4 outline-none">
          <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Stock movement history for this location.</p>
              <Button size="sm" onClick={() => router.push("/dashboard/transfers")}>Manage Transfers</Button>
            </div>
            {transfers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No stock transfers found for this branch.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {transfers.map(t => {
                  const isIncoming = t.dest_branch_id === branchId;
                  return (
                    <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {isIncoming ? <ArrowRightLeft className="w-5 h-5 rotate-90" /> : <ArrowRightLeft className="w-5 h-5 -rotate-90" />}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {isIncoming ? "Incoming Transfer" : "Outgoing Transfer"}
                            <Badge variant="outline" className="text-[10px] capitalize">{t.status.replace(/_/g, " ")}</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(t.created_at), "PPp")}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {t.notes || "No notes"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignStaffOpen} onOpenChange={setIsAssignStaffOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Branch Staff</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center italic">No staff members created yet.</p>
            ) : (
              <div className="space-y-2">
                {staff.map(s => {
                  const isAssigned = s.branch_ids?.includes(branchId);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.role_title || "Staff"}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={isAssigned ? "destructive" : "default"}
                        className={isAssigned ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-0" : ""}
                        onClick={() => toggleStaffAssignment(s)}
                      >
                        {isAssigned ? "Remove" : "Assign"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
