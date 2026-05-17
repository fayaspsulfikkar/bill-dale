"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type StaffMember, type ActivityLog } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { formatINR } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, UserCheck, Phone, Pencil, Trash2, Crown, ToggleLeft, ToggleRight, Search, Trophy, Building2, X, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

type StatusFilter = "all" | "active" | "inactive";

const EMPTY_FORM = { name: "", phone: "", role_title: "Sales Staff", branch_ids: [] as string[] };

export default function UsersPage() {
  const { businessId, user: currentUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Live data
  const allStaff = useLiveQuery(
    () => businessId ? db.staff_members.where("business_id").equals(businessId).toArray() : [],
    [businessId]
  ) || [];
  const branches = useLiveQuery(() => db.branches.toArray()) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];

  // Staff stats from invoices
  const staffStats = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number; lastDate: string }> = {};
    invoices.forEach(inv => {
      const name = inv.staff_name;
      if (!name) return;
      if (!map[name]) map[name] = { orders: 0, revenue: 0, lastDate: "" };
      map[name].orders++;
      map[name].revenue += inv.total_amount;
      if (inv.created_at > map[name].lastDate) map[name].lastDate = inv.created_at;
    });
    return map;
  }, [invoices]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    let list = allStaff;
    if (statusFilter === "active") list = list.filter(s => s.is_active);
    if (statusFilter === "inactive") list = list.filter(s => !s.is_active);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone || "").includes(q) ||
        s.role_title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allStaff, statusFilter, search]);

  // Top performers (this month)
  const leaderboard = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthInvoices = invoices.filter(i => i.created_at >= monthStart);
    const map: Record<string, number> = {};
    monthInvoices.forEach(i => {
      const name = i.staff_name;
      if (!name) return;
      map[name] = (map[name] || 0) + i.total_amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, revenue]) => ({ name, revenue }));
  }, [invoices]);

  // Activity log helper
  const logActivity = async (action: string, details: Record<string, unknown>) => {
    if (!businessId) return;
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      business_id: businessId,
      user_id: currentUser?.id || "system",
      action,
      details,
      created_at: new Date().toISOString(),
    };
    await db.activity_logs.add(log);
  };

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({ name: m.name, phone: m.phone ?? "", role_title: m.role_title, branch_ids: m.branch_ids || [] });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    try {
      if (editingId) {
        const oldMember = allStaff.find(s => s.id === editingId);
        await db.staff_members.update(editingId, {
          name: form.name,
          phone: form.phone || undefined,
          role_title: form.role_title,
          branch_ids: form.branch_ids.length > 0 ? form.branch_ids : undefined,
        });
        // Log branch transfer if changed
        const oldBranches = (oldMember?.branch_ids || []).sort().join(",");
        const newBranches = form.branch_ids.sort().join(",");
        if (oldBranches !== newBranches) {
          const branchNames = form.branch_ids.map(id => branches.find(b => b.id === id)?.name || id);
          await logActivity("staff_transferred", { staff_name: form.name, branches: branchNames });
        } else {
          await logActivity("staff_edited", { staff_name: form.name });
        }
      } else {
        const newMember: StaffMember = {
          id: crypto.randomUUID(),
          business_id: businessId,
          name: form.name,
          phone: form.phone || undefined,
          role_title: form.role_title || "Sales Staff",
          is_active: true,
          branch_ids: form.branch_ids.length > 0 ? form.branch_ids : undefined,
          created_at: new Date().toISOString(),
        };
        await db.staff_members.add(newMember);
        await logActivity("staff_added", { staff_name: form.name, role: form.role_title });
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: StaffMember) => {
    if (!confirm(`Remove ${m.name}?`)) return;
    await db.staff_members.delete(m.id);
    await logActivity("staff_deleted", { staff_name: m.name });
  };

  const toggleActive = async (m: StaffMember) => {
    await db.staff_members.update(m.id, { is_active: !m.is_active });
    await logActivity(m.is_active ? "staff_deactivated" : "staff_activated", { staff_name: m.name });
  };

  const toggleBranch = (branchId: string) => {
    setForm(prev => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId],
    }));
  };

  const statusCounts = useMemo(() => ({
    all: allStaff.length,
    active: allStaff.filter(s => s.is_active).length,
    inactive: allStaff.filter(s => !s.is_active).length,
  }), [allStaff]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Users</h1>
          <p className="text-muted-foreground">Manage staff records for billing attribution and sales tracking.</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {/* Owner / Admin card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/30" alt="avatar" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-2xl">
                  {(currentUser?.name || currentUser?.email || "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{currentUser?.name || "Account Owner"}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">Admin</span>
              </div>
              <p className="text-muted-foreground text-sm">{currentUser?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Full access · Manages all settings and reports</p>
            </div>
            <Crown className="w-5 h-5 text-yellow-500 opacity-70" />
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-start gap-3">
        <UserCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Staff are records, not logins</p>
          <p className="text-xs opacity-80 mt-0.5">
            Staff members below are used for billing attribution and sales tracking only. They do not get a separate login — only Google accounts (admin) can log in.
            Use <strong>Staff Mode</strong> in the sidebar to restrict the UI when handing the device to staff.
          </p>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or role…"
            className="pl-9 h-10 bg-card/50 border-border/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card/80 hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Staff table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Members
            <span className="text-muted-foreground font-normal text-sm ml-1">({filteredStaff.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
              <Users className="w-12 h-12 opacity-20" />
              <p>{search || statusFilter !== "all" ? "No staff match your filters." : "No staff added yet."}</p>
              {!search && statusFilter === "all" && (
                <Button variant="outline" size="sm" onClick={openAdd} className="gap-2">
                  <Plus className="w-4 h-4" /> Add your first staff member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((m) => {
                const stats = staffStats[m.name];
                const assignedBranches = (m.branch_ids || []).map(id => branches.find(b => b.id === id)).filter(Boolean);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30 hover:bg-muted/20 transition-all group"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      m.is_active ? "bg-blue-500/10 text-blue-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {m.name[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{m.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">{m.role_title}</span>
                        {!m.is_active && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {m.phone && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {m.phone}
                          </span>
                        )}
                        {assignedBranches.length > 0 && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {assignedBranches.map(b => b!.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline Stats */}
                    {stats ? (
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><ShoppingCart className="w-3 h-3" /> Orders</p>
                          <p className="text-sm font-bold">{stats.orders}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" /> Revenue</p>
                          <p className="text-sm font-bold font-mono">{formatINR(stats.revenue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" /> Last Billed</p>
                          <p className="text-xs font-medium">{formatDistanceToNow(new Date(stats.lastDate), { addSuffix: true })}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="hidden sm:block text-xs text-muted-foreground/50 italic">No sales yet</span>
                    )}

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(m)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          m.is_active ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={m.is_active ? "Deactivate" : "Activate"}
                      >
                        {m.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(m)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard — This Month's Top Performers */}
      {leaderboard.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              This Month&apos;s Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {leaderboard.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    i === 0 ? "bg-yellow-500/15 text-yellow-500" :
                    i === 1 ? "bg-slate-400/15 text-slate-400" :
                    "bg-amber-700/15 text-amber-700"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formatINR(entry.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul" className="bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role / Title</Label>
                <Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Sales Staff" className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" className="bg-background/50" />
              </div>
            </div>

            {/* Branch Assignment */}
            {branches.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Assigned Branches
                </Label>
                <p className="text-[11px] text-muted-foreground -mt-1">Select the branches this staff works at. Leave empty for all branches.</p>
                <div className="flex flex-wrap gap-1.5">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBranch(b.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        form.branch_ids.includes(b.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-foreground border-border/50 hover:bg-muted"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Staff Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
