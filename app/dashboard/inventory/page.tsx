"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Product, type Inventory, type Branch } from "@/offline/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus } from "lucide-react";

export default function InventoryPage() {
  const products = useLiveQuery(() => db.products.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const branches = useLiveQuery(() => db.branches.toArray());

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", category: "", brand: "", size: "", color: "", sku: "", price: "", gst_percent: "18", stock: "0", branch_id: ""
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch_id) {
      alert("Please select a branch to assign the initial stock.");
      return;
    }

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      size: formData.size,
      color: formData.color,
      sku: formData.sku,
      price: parseFloat(formData.price),
      gst_percent: parseFloat(formData.gst_percent),
      created_at: new Date().toISOString(),
    };

    const newInventory: Inventory = {
      id: crypto.randomUUID(),
      product_id: newProduct.id,
      branch_id: formData.branch_id,
      stock: parseInt(formData.stock),
      last_updated: new Date().toISOString(),
    };

    await db.transaction('rw', db.products, db.inventory, db.sync_queue, async () => {
      await db.products.add(newProduct);
      await db.inventory.add(newInventory);
      
      const ts = new Date().toISOString();
      await db.sync_queue.add({ table_name: 'products', operation: 'INSERT', data: newProduct, timestamp: ts });
      await db.sync_queue.add({ table_name: 'inventory', operation: 'INSERT', data: newInventory, timestamp: ts });
    });

    setIsOpen(false);
    setFormData({ name: "", category: "", brand: "", size: "", color: "", sku: "", price: "", gst_percent: "18", stock: "0", branch_id: "" });
  };

  const getStockCount = (productId: string) => {
    if (!inventory) return 0;
    return inventory.filter(i => i.product_id === productId).reduce((acc, curr) => acc + curr.stock, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your product catalog and stock levels</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground font-semibold" />}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Air Jordan 1 High" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Nike" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Sneakers" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>SKU / Barcode</Label>
                <Input required value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="NK-AJ1-RED" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Input required value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="US 10" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input required value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="Chicago Red" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Selling Price ($)</Label>
                <Input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="180.00" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>GST Percentage (%)</Label>
                <Input required type="number" step="0.1" value={formData.gst_percent} onChange={e => setFormData({ ...formData, gst_percent: e.target.value })} className="bg-background/50" />
              </div>

              <div className="col-span-2 pt-4 border-t border-border/50">
                <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Initial Stock Assignment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assign to Branch</Label>
                    <Select value={formData.branch_id} onValueChange={(val) => setFormData({ ...formData, branch_id: val || "" })}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches?.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Stock Quantity</Label>
                    <Input required type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} min="0" className="bg-background/50" />
                  </div>
                </div>
              </div>
              
              <div className="col-span-2 pt-4">
                <Button type="submit" className="w-full">Create Product & Assign Stock</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {products?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Package className="w-12 h-12 mb-4 opacity-20" />
              <p>No products found. Add your first product to the catalog.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand / Category</TableHead>
                  <TableHead>Size / Color</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map(product => (
                  <TableRow key={product.id} className="border-border/50">
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.brand} / {product.category}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{product.size} / {product.color}</TableCell>
                    <TableCell className="text-right font-medium">${product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-primary/20 text-primary">
                        {getStockCount(product.id)}
                      </span>
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
