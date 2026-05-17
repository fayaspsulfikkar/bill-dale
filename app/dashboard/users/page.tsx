"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type StaffMember } from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, UserCheck, Phone, Pencil, Trash2, Crown, ToggleLeft, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";

const EMPTY_FORM = { name: "", phone: "", role_title: "Sales Staff" };

export default function UsersPage() {
  const { businessId, user: currentUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Live query from Dexie — always up to date, works offline
  const staff = useLiveQuery(
    () => businessId ? db.staff_members.where("business_id").equals(businessId).toArray() : [],
    [businessId]
  ) || [];

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({ name: m.name, phone: m.phone ?? "", role_title: m.role_title });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    try {
      if (editingId) {
        await db.staff_members.update(editingId, {
          name: form.name,
          phone: form.phone || undefined,
          role_title: form.role_title,
        });
      } else {
        const newMember: StaffMember = {
          id: crypto.randomUUID(),
          business_id: businessId,
          name: form.name,
          phone: form.phone || undefined,
          role_title: form.role_title || "Sales Staff",
          is_active: true,
          created_at: new Date().toISOString(),
        };
        await db.staff_members.add(newMember);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    await db.staff_members.delete(id);
  };

  const toggleActive = async (m: StaffMember) => {
    await db.staff_members.update(m.id, { is_active: !m.is_active });
  };

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

      {/* Staff table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Members
            <span className="text-muted-foreground font-normal text-sm ml-1">({staff.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
              <Users className="w-12 h-12 opacity-20" />
              <p>No staff added yet.</p>
              <Button variant="outline" size="sm" onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" /> Add your first staff member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((m) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {m.name[0].toUpperCase()}
                        </div>
                        <p className="font-medium text-sm">{m.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        {m.role_title}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {m.phone}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActive(m)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                          m.is_active ? "text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        {m.is_active
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />
                        }
                        {m.is_active ? "Active" : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(m)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/5">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul" className="bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Title</Label>
              <Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Sales Staff" className="bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" className="bg-background/50" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Staff Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
