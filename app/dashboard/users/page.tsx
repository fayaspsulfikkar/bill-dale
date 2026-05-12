"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, User as UserIcon, RefreshCw, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface Member {
  id: string;
  user_id: string;
  role: "admin" | "staff";
  joined_at: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export default function UsersPage() {
  const { businessId, user: currentUser, role: myRole } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!supabase || !businessId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch memberships with user profile data from auth.users via RPC
      const { data, error } = await supabase
        .from("business_members")
        .select("id, user_id, role, joined_at")
        .eq("business_id", businessId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      // Fetch user emails via Supabase auth admin — fall back to user_id display
      const enriched: Member[] = (data ?? []).map((m) => ({
        ...m,
        role: m.role as "admin" | "staff",
        email: currentUser && m.user_id === currentUser.id
          ? currentUser.email
          : `User ${m.user_id.slice(0, 8)}…`,
        name: currentUser && m.user_id === currentUser.id ? currentUser.name : undefined,
        avatar_url: currentUser && m.user_id === currentUser.id ? currentUser.avatar_url : undefined,
      }));

      setMembers(enriched);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  }, [businessId, currentUser]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleRoleChange = async (memberId: string, userId: string, newRole: "admin" | "staff") => {
    if (!supabase || myRole !== "admin") return;
    if (userId === currentUser?.id) {
      alert("You cannot change your own role.");
      return;
    }
    setUpdatingId(memberId);
    try {
      const { error } = await supabase
        .from("business_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error("Role update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const isMe = (m: Member) => m.user_id === currentUser?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Users</h1>
          <p className="text-muted-foreground">Manage team roles and access levels.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Your account card */}
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
                <p className="font-bold text-lg">{currentUser?.name || "Your Account"}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">
                  {myRole ?? "staff"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{currentUser?.email}</p>
            </div>
            <Crown className="w-5 h-5 text-yellow-500 opacity-70" />
          </div>
        </CardContent>
      </Card>

      {/* Members table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members <span className="text-muted-foreground font-normal text-sm ml-1">({members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p>No team members yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {myRole === "admin" && <TableHead className="text-right">Change Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {m.role === "admin"
                              ? <Shield className="w-4 h-4" />
                              : <UserIcon className="w-4 h-4" />
                            }
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {m.name || m.email}
                            {isMe(m) && (
                              <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          {m.name && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        m.role === "admin"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {m.role.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    {myRole === "admin" && (
                      <TableCell className="text-right">
                        {isMe(m) ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Select
                            value={m.role}
                            onValueChange={(val) => {
                              if (val) handleRoleChange(m.id, m.user_id, val as "admin" | "staff");
                            }}
                            disabled={updatingId === m.id}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs bg-background/50 ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
