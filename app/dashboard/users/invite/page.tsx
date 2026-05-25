"use client";

import { useState } from "react";
import { useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Link2, Copy, CheckCheck, UserPlus } from "lucide-react";

export default function InvitePage() {
  const { user, businessId } = useAuthStore();
  const [invites, setInvites] = useState<any[]>([]);

  const fetchInvites = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase.from("staff_invitations").select("*").eq("business_id", businessId);
    if (data) setInvites(data);
  }, [businessId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !user) return;
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    await supabase.from("staff_invitations").insert({
      id: crypto.randomUUID(),
      business_id: businessId,
      token,
      invited_by: user.id,
      email: email || null,
      role,
      permissions: [],
      expires_at: expires.toISOString(),
    });
    fetchInvites();
    setEmail("");
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <RoleGuard adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Staff</h1>
          <p className="text-muted-foreground">Generate invite links to add staff members to your business.</p>
        </div>

        <Card className="bg-card/50 border-border/50 max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-4 h-4 text-primary" /> Create Invite Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email (optional)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" type="email" className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "staff" | "admin")}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <Link2 className="w-4 h-4 mr-2" /> Generate Invite Link
              </Button>
            </form>
          </CardContent>
        </Card>

        {invites && invites.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader><CardTitle className="text-base">Active Invitations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/30">
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">{`${window.location.origin}/invite/${inv.token}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Role: <span className="capitalize font-medium text-foreground">{inv.role}</span>
                      {inv.email && ` · ${inv.email}`}
                      {inv.accepted_at ? " · ✅ Accepted" : ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                    {copiedId === inv.token ? <CheckCheck className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
