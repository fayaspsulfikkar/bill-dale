"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db from "@/offline/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, isToday, parseISO, getHours } from "date-fns";
import { DollarSign, ShoppingBag, ReceiptText, MapPin } from "lucide-react";

export default function DashboardOverview() {
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const invoiceItems = useLiveQuery(() => db.invoice_items.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const branches = useLiveQuery(() => db.branches.toArray()) || [];

  // Metrics Logic
  const todaysInvoices = invoices.filter(i => isToday(parseISO(i.created_at)));
  const todaysSales = todaysInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalOrders = invoices.length;

  // Branch Comparison (Sales Volume per branch)
  const branchData = branches.map(b => {
    const branchInvoices = invoices.filter(i => i.branch_id === b.id);
    return {
      name: b.name,
      sales: branchInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    };
  });

  // Peak Hours Data (Count of orders per hour)
  const hoursMap = new Array(24).fill(0);
  invoices.forEach(inv => {
    const hour = getHours(parseISO(inv.created_at));
    hoursMap[hour]++;
  });
  const peakHoursData = hoursMap.map((count, hour) => ({
    time: `${hour}:00`,
    orders: count
  })).filter(d => d.orders > 0);

  // Top Selling Items
  const productSalesCount: Record<string, number> = {};
  invoiceItems.forEach(item => {
    productSalesCount[item.product_id] = (productSalesCount[item.product_id] || 0) + item.quantity;
  });

  const topSelling = Object.entries(productSalesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productId, count]) => {
      const prod = products.find(p => p.id === productId);
      return {
        name: prod?.name || 'Unknown',
        sales: count,
        sku: prod?.sku || '---'
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase">Overview</h1>
        <p className="text-muted-foreground">Real-time metrics and offline analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/20 shadow-[inset_0_0_10px_rgba(var(--primary),0.05)]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's Revenue</p>
              <h2 className="text-3xl font-black font-mono text-primary">${todaysSales.toFixed(2)}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <ReceiptText className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-black font-mono">${totalSales.toFixed(2)}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <ShoppingBag className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
              <h2 className="text-3xl font-black font-mono">{totalOrders}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Branches</p>
              <h2 className="text-3xl font-black font-mono">{branches.filter(b => b.is_active).length}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Comparisons */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Branch Revenue Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {branchData.length > 0 && branchData.some(b => b.sales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }} />
                  <Bar dataKey="sales" fill="oklch(0.65 0.25 250)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data to display</div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Peak Sales Hours (Order Frequency)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {peakHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={peakHoursData}>
                  <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', border: '1px solid oklch(1 0 0 / 10%)' }} />
                  <Line type="monotone" dataKey="orders" stroke="oklch(0.65 0.25 250)" strokeWidth={3} dot={{ fill: 'oklch(0.65 0.25 250)' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data to display</div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="bg-card/50 border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Selling Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling.length > 0 ? (
              <div className="space-y-4">
                {topSelling.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/20 text-primary font-black rounded-md">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                    </div>
                    <div className="font-bold text-lg">
                      {item.sales} <span className="text-xs text-muted-foreground font-normal">Units</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No sales data available yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
