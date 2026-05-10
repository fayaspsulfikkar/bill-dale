"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Branch } from "@/offline/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus } from "lucide-react";

export default function BranchesPage() {
  const branches = useLiveQuery(() => db.branches.toArray());
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBranch: Branch = {
      id: crypto.randomUUID(),
      name,
      location,
      contact,
      is_active: true,
    };
    await db.branches.add(newBranch);
    await db.sync_queue.add({
      table_name: 'branches',
      operation: 'INSERT',
      data: newBranch,
      timestamp: new Date().toISOString()
    });
    setIsOpen(false);
    setName("");
    setLocation("");
    setContact("");
  };

  const toggleActive = async (branch: Branch) => {
    const updated = { ...branch, is_active: !branch.is_active };
    await db.branches.put(updated);
    await db.sync_queue.add({
      table_name: 'branches',
      operation: 'UPDATE',
      data: updated,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Manage your retail locations</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground font-semibold" />}>
            <Plus className="w-4 h-4 mr-2" /> Add Branch
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBranch} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Downtown Sneaker Hub" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Location / Address</Label>
                <Input required value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St..." className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input required value={contact} onChange={e => setContact(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-background/50" />
              </div>
              <Button type="submit" className="w-full">Save Branch</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {branches?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <MapPin className="w-12 h-12 mb-4 opacity-20" />
              <p>No branches found. Add your first retail location to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches?.map(branch => (
                  <TableRow key={branch.id} className="border-border/50">
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-muted-foreground">{branch.location}</TableCell>
                    <TableCell className="text-muted-foreground">{branch.contact}</TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? "default" : "secondary"} className={branch.is_active ? "bg-primary/20 text-primary" : ""}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(branch)}>
                        Toggle Status
                      </Button>
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
