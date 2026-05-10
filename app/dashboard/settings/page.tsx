"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Receipt, Palette, HardDrive, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your POS system preferences and store details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Store Details
            </CardTitle>
            <CardDescription>Update your store information for receipts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input defaultValue="BillDale Retail" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input defaultValue="+1 (555) 000-0000" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Store Address</Label>
              <Input defaultValue="123 Sneaker St, NY 10001" className="bg-background/50" />
            </div>
            <Button className="w-full">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Tax & Compliance
            </CardTitle>
            <CardDescription>Configure default tax rates and GST details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default GST/Tax Rate (%)</Label>
              <Input defaultValue="18" type="number" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Tax Identification Number</Label>
              <Input defaultValue="GST123456789" className="bg-background/50" />
            </div>
            <div className="pt-2">
               <p className="text-xs text-muted-foreground mb-4">Note: Individual products can override this default rate.</p>
               <Button className="w-full">Update Tax Settings</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Hardware Integration
            </CardTitle>
            <CardDescription>Connect receipt printers and barcode scanners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-border/50 rounded-lg bg-background/30 flex items-center justify-between">
              <div>
                <p className="font-medium">Thermal Printer</p>
                <p className="text-xs text-muted-foreground">Not connected</p>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
            <div className="p-4 border border-border/50 rounded-lg bg-background/30 flex items-center justify-between">
              <div>
                <p className="font-medium">Barcode Scanner</p>
                <p className="text-xs text-green-500">Ready</p>
              </div>
              <Button variant="outline" size="sm">Test</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Appearance & Sync
            </CardTitle>
            <CardDescription>Customize interface and manage offline data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 border border-border/50 rounded-lg bg-background/30 flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Currently enabled</p>
              </div>
              <Button variant="outline" size="sm" disabled>Active</Button>
            </div>
            <div className="p-4 border border-border/50 rounded-lg bg-background/30 flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Force Sync Data</p>
                <p className="text-xs text-muted-foreground">Manually push offline queue to server</p>
              </div>
              <Button variant="destructive" size="sm">Sync Now</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
