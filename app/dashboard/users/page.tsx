"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type User } from "@/offline/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Shield, User as UserIcon } from "lucide-react";

export default function UsersPage() {
  const users = useLiveQuery(() => db.users.toArray());
  const branches = useLiveQuery(() => db.branches.toArray());

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "staff" as "admin" | "staff",
    branch_id: "",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.role === "staff" && !formData.branch_id) {
      alert("Staff members must be assigned to a branch.");
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(), // In a real app with Supabase Auth, this would be the Supabase User ID
      email: formData.email,
      role: formData.role,
      branch_id: formData.role === "admin" ? null : formData.branch_id,
      created_at: new Date().toISOString(),
    };

    await db.transaction("rw", db.users, db.sync_queue, async () => {
      await db.users.add(newUser);

      // Add to sync queue to create the user in Supabase later
      await db.sync_queue.add({
        table_name: "users",
        operation: "INSERT",
        data: {
          ...newUser,
          _temp_password: formData.password, // For the sync worker to create the Auth account
        },
        timestamp: new Date().toISOString(),
      });
    });

    setIsOpen(false);
    setFormData({ email: "", password: "", role: "staff", branch_id: "" });
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId || !branches) return "All Branches (Admin)";
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.name : "Unknown Branch";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Users</h1>
          <p className="text-muted-foreground">Manage system access, roles, and branch assignments.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground font-semibold" />}>
            <Plus className="w-4 h-4 mr-2" /> Create User
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Login</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email Address (Login ID)</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@billdale.com"
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => {
                    if (!val) return;
                    setFormData({ ...formData, role: val as "admin" | "staff", branch_id: val === "admin" ? "" : formData.branch_id })
                  }}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff (Branch Limited)</SelectItem>
                    <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "staff" && (
                <div className="space-y-2">
                  <Label>Assign to Branch</Label>
                  <Select
                    required
                    value={formData.branch_id}
                    onValueChange={(val) => setFormData({ ...formData, branch_id: val || "" })}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4">
                <Button type="submit" className="w-full">
                  Create User Login
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p>No staff accounts found. Create a user to grant system access.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>User / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch Assignment</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} className="border-border/50">
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {user.role === "admin" ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                      </div>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getBranchName(user.branch_id)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
