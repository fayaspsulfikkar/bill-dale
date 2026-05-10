"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  business_created: "Business Created",
  user_login: "User Login",
  invoice_created: "Invoice Created",
  product_added: "Product Added",
  stock_updated: "Stock Updated",
  staff_invited: "Staff Invited",
  staff_joined: "Staff Joined",
};

export default function ActivityPage() {
  const { businessId } = useAuthStore();
  const logs = useLiveQuery(
    () => businessId
      ? db.activity_logs.where("business_id").equals(businessId).reverse().sortBy("created_at")
      : [],
    [businessId]
  );

  return (
    <RoleGuard adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">Audit trail of all actions in your business account.</p>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>No activity recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
