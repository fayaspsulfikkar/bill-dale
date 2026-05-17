"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice } from "@/offline/db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getHours, parseISO, format } from "date-fns";
import { Clock } from "lucide-react";

interface Props {
  invoices: Invoice[];
}

export function PeakHoursChart({ invoices }: Props) {
  const { data, peakHour, insight } = useMemo(() => {
    const hoursMap: { orders: number; revenue: number }[] = Array.from({ length: 24 }, () => ({ orders: 0, revenue: 0 }));

    invoices.forEach(inv => {
      const h = getHours(parseISO(inv.created_at));
      hoursMap[h].orders++;
      hoursMap[h].revenue += inv.total_amount;
    });

    const chartData = hoursMap.map((d, h) => ({
      hour: format(new Date(2000, 0, 1, h), "ha"),
      hourNum: h,
      orders: d.orders,
      revenue: d.revenue,
    })).filter(d => d.orders > 0);

    const peak = chartData.reduce((max, d) => d.orders > max.orders ? d : max, chartData[0] || { hour: "N/A", orders: 0 });
    
    let insightText = "";
    if (chartData.length > 0) {
      insightText = `Peak sales time: ${peak.hour} with ${peak.orders} orders (${formatINR(peak.revenue)})`;
    }

    return { data: chartData, peakHour: peak?.hourNum, insight: insightText };
  }, [invoices]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Peak Sales Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="hour" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "13px" }}
                  formatter={(value: any, name: any) => [name === "revenue" ? formatINR(Number(value)) : value, name === "revenue" ? "Revenue" : "Orders"]}
                />
                <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.hourNum === peakHour ? "oklch(0.65 0.25 250)" : "oklch(0.65 0.25 250 / 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data</div>
          )}
        </div>
        {insight && (
          <div className="flex items-center gap-2 mt-2 px-1 py-2 rounded-lg bg-primary/5 text-xs text-primary font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {insight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
