"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/formatCurrency";
import type { Invoice } from "@/offline/db";
import type { DateRange } from "./DateRangeFilter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, eachDayOfInterval, eachHourOfInterval, parseISO, isSameDay, isSameHour } from "date-fns";

interface Props {
  invoices: Invoice[];
  dateRange: DateRange;
}

export function SalesTrendChart({ invoices, dateRange }: Props) {
  const data = useMemo(() => {
    const isOneDay = isSameDay(dateRange.from, dateRange.to);

    if (isOneDay) {
      // Hourly granularity
      const hours = eachHourOfInterval({ start: dateRange.from, end: dateRange.to });
      return hours.map(h => {
        const matching = invoices.filter(i => isSameHour(parseISO(i.created_at), h));
        return {
          label: format(h, "ha"),
          revenue: matching.reduce((s, i) => s + i.total_amount, 0),
          orders: matching.length,
        };
      });
    } else {
      // Daily granularity
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map(d => {
        const matching = invoices.filter(i => isSameDay(parseISO(i.created_at), d));
        return {
          label: format(d, "dd MMM"),
          revenue: matching.reduce((s, i) => s + i.total_amount, 0),
          orders: matching.length,
        };
      });
    }
  }, [invoices, dateRange]);

  const hasData = data.some(d => d.revenue > 0 || d.orders > 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sales Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.25 250)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.25 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "13px" }}
                formatter={(value: any, name: any) => [name === "revenue" ? formatINR(Number(value)) : value, name === "revenue" ? "Revenue" : "Orders"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.65 0.25 250)" strokeWidth={2.5} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No sales data for this period</div>
        )}
      </CardContent>
    </Card>
  );
}
