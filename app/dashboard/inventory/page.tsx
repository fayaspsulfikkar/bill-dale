"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProducts, useInventory, useBranches } from "@/lib/api/queries";
import type { Product, Inventory, Branch } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";
import { useDeviceStore } from "@/store/deviceStore";
import { initScannerDetector } from "@/lib/devices/scannerDetector";
import { AdminPinDialog } from "@/components/AdminPinDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/formatCurrency";
import { Plus, Search, AlertCircle, Building2, Pencil, Check, X, Trash2, PlusCircle, ChevronDown, Barcode, Download, Upload, Undo, RefreshCw, Sparkles, Volume2, ShoppingBag } from "lucide-react";
import { useCurrencyVersion } from "@/components/CurrencyRefreshBoundary";
import { useNeedsApproval } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";

interface SizeVariant { id: string; size: string; sku: string; stockPerBranch: Record<string, string>; }
interface FormState { name: string; category: string; brand: string; color: string; price: string; gst_percent: string; price_includes_gst: boolean; variants: SizeVariant[]; }

interface ScanLog {
  id: string;
  product_id: string;
  branch_id: string;
  sku: string;
  name: string;
  size: string;
  color: string;
  previousStock: number;
  newStock: number;
  delta: number;
  timestamp: string;
}

interface CsvRecord {
  sku: string;
  stock: number;
  productName: string;
  sizeColor: string;
  currentStock: number;
  newStock: number;
}

function getBase(price: string, gst: string, inc: boolean) {
  const p = parseFloat(price) || 0, g = parseFloat(gst) || 0;
  return inc ? parseFloat((p / (1 + g / 100)).toFixed(2)) : p;
}

// Zero-dependency offline audio synthesiser chime using Web Audio API
function playBeep(type: "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "success") {
      // Crisp high double chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);

      const delay = 0.08;
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, audioCtx.currentTime + delay); // E6
      gain2.gain.setValueAtTime(0.04, audioCtx.currentTime + delay);
      osc2.start(audioCtx.currentTime + delay);
      osc2.stop(audioCtx.currentTime + delay + 0.12);
    } else {
      // Deep buzzer sound
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    }
  } catch (err) {
    console.error("Audio chime failed", err);
  }
}

// Alphanumeric SKU auto-generator
function generateSKU(brand: string, name: string, color: string, size: string): string {
  const brandPart = (brand || "GEN").trim().substring(0, 3).toUpperCase();
  
  // Create name initials (up to 4 chars)
  const namePart = (name || "PRD")
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .substring(0, 4)
    .toUpperCase();
    
  const colorPart = (color || "ALL").trim().substring(0, 3).toUpperCase();
  const sizePart = (size || "SZ").trim().replace(/\s+/g, "").toUpperCase();
  
  return `${brandPart}-${namePart}-${colorPart}-${sizePart}`;
}

function StockCell({ stock, isSelected, onEdit }: { stock: number; isSelected: boolean; onEdit: () => void }) {
  const cls = stock === 0 ? "bg-red-500/10 text-red-500" : stock <= 5 ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600";
  return (
    <button onClick={onEdit} className={cn("inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg text-xs font-bold transition-all hover:ring-2 hover:ring-primary/40 group relative", cls, isSelected && "ring-2 ring-primary/30")}>
      {stock === 0 ? "—" : stock}
      <Pencil className="w-2.5 h-2.5 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-background rounded-full p-0.5 text-muted-foreground" />
    </button>
  );
}

export default function InventoryPage() {
  useCurrencyVersion();
  const { user, role, businessId, staffMode, setStaffMode } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: products = [] } = useProducts(businessId || null);
  const { data: branches = [] } = useBranches(businessId || null);
  const branchIds = useMemo(() => branches.map(b => b.id), [branches]);
  const { data: inventory = [] } = useInventory(branchIds);
  const dbUser = user;

  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [] });
  const [submitting, setSubmitting] = useState(false);
  const [editCell, setEditCell] = useState<{ productId: string; branchId: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [pinForEdit, setPinForEdit] = useState<{ productId: string; branchId: string; stock: number } | null>(null);
  const [pinForAddProduct, setPinForAddProduct] = useState(false);
  const [pinForDelete, setPinForDelete] = useState<string | null>(null);
  const [pinForAddBranch, setPinForAddBranch] = useState(false);
  const needsDeleteApproval = useNeedsApproval("delete_products");

  // New Frictionless Features State
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "low" | "out">("all");
  
  // Barcode Scanning Console States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanMode, setScanMode] = useState<"increment" | "decrement" | "set">("increment");
  const [scanLedger, setScanLedger] = useState<ScanLog[]>([]);

  // CSV Import States
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvRecord[] | null>(null);

  const { selectedBranchId } = usePOSStore();
  const { scanner } = useDeviceStore();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Default chip to staff's branch
  useEffect(() => {
    if (dbUser?.branch_id && branchFilter === "all" && role === "staff") setBranchFilter(dbUser.branch_id);
  }, [dbUser?.branch_id, role]);

  // Add first variant when dialog opens
  const openDialog = () => {
    setForm({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [newVariant()] });
    setIsOpen(true);
  };

  const newVariant = (): SizeVariant => ({ id: crypto.randomUUID(), size: "", sku: "", stockPerBranch: Object.fromEntries(branches.map(b => [b.id, "0"])) });

  const getBranchStock = (pid: string, bid: string) => inventory.find(i => i.product_id === pid && i.branch_id === bid)?.stock ?? 0;
  const getTotalStock = (pid: string) => inventory.filter(i => i.product_id === pid).reduce((s, i) => s + i.stock, 0);

  // Ordered branches: selected first
  const orderedBranches = useMemo(() => {
    const primaryBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId;
    if (!primaryBranchId) return branches;
    
    const sel = branches.find(b => b.id === primaryBranchId);
    return sel ? [sel, ...branches.filter(b => b.id !== primaryBranchId)] : branches;
  }, [branches, branchFilter, selectedBranchId]);

  const filtered = useMemo(() => {
    let p = products;
    if (search) { 
      const q = search.toLowerCase(); 
      p = p.filter(pr => pr.name.toLowerCase().includes(q) || pr.sku.toLowerCase().includes(q) || pr.brand.toLowerCase().includes(q)); 
    }
    
    // Stats cards quick filters
    const currentBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : "");
    if (activeTabFilter === "low" && currentBranchId) {
      p = p.filter(pr => {
        const stock = getBranchStock(pr.id, currentBranchId);
        return stock > 0 && stock <= (pr.low_stock_threshold ?? 5);
      });
    } else if (activeTabFilter === "out" && currentBranchId) {
      p = p.filter(pr => getBranchStock(pr.id, currentBranchId) === 0);
    }
    
    const sortBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId;
    if (sortBranchId) {
      p = [...p].sort((a, b) => getBranchStock(b.id, sortBranchId) - getBranchStock(a.id, sortBranchId));
    }
    return p;
  }, [products, search, branchFilter, inventory, selectedBranchId, activeTabFilter, branches]);

  // Statistics summaries for active branch
  const stats = useMemo(() => {
    const activeBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : "");
    if (!activeBranchId) return { totalProducts: products.length, totalStock: 0, lowStock: 0, outOfStock: 0 };

    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach(p => {
      const stock = getBranchStock(p.id, activeBranchId);
      totalStock += stock;
      if (stock === 0) {
        outOfStock++;
      } else if (stock <= (p.low_stock_threshold ?? 5)) {
        lowStock++;
      }
    });

    return {
      totalProducts: products.length,
      totalStock,
      lowStock,
      outOfStock
    };
  }, [products, inventory, branchFilter, selectedBranchId, branches]);

  // Dynamic SKU generation inside dialog
  const generateAllSKUs = () => {
    if (!form.name || !form.brand) {
      alert("Please fill in Product Name and Brand first to generate SKUs.");
      return;
    }
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        sku: v.sku.trim() ? v.sku : generateSKU(f.brand, f.name, f.color, v.size)
      }))
    }));
  };

  // Barcode Wedging scanning interceptor
  const handleBarcodeScanned = async (barcode: string) => {
    const targetSKU = barcode.trim();
    if (!targetSKU) return;

    const match = products.find(p => p.sku.toLowerCase() === targetSKU.toLowerCase());
    const targetBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : null);

    if (!targetBranchId) {
      playBeep("error");
      alert("No active branch selected. Please set a POS active branch or branch filter first.");
      return;
    }

    if (!match) {
      playBeep("error");
      // Populate input if unrecognized so the user can see what scanned or add it
      setScanInput(barcode);
      setIsScanModalOpen(true);
      return;
    }

    // Modal active mode vs background scan default mode
    const mode = isScanModalOpen ? scanMode : "increment";
    const currentStock = getBranchStock(match.id, targetBranchId);
    
    let newStock = currentStock;
    let delta = 0;

    if (mode === "increment") {
      delta = 1;
      newStock = currentStock + 1;
    } else if (mode === "decrement") {
      delta = -1;
      newStock = Math.max(0, currentStock - 1);
    } else {
      // Absolute Set mode inside the active modal input text
      const parsedVal = Math.max(0, parseInt(scanInput) || 0);
      delta = parsedVal - currentStock;
      newStock = parsedVal;
    }

    const ts = new Date().toISOString();
    const existing = inventory.find(i => i.product_id === match.id && i.branch_id === targetBranchId);

    try {
      if (existing) {
        await supabase.from('inventory').update({ stock: newStock, last_updated: ts }).eq('id', existing.id);
      } else {
        const nw: Inventory = { id: crypto.randomUUID(), product_id: match.id, branch_id: targetBranchId, stock: newStock, last_updated: ts };
        await supabase.from('inventory').insert(nw);
      }
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      const log: ScanLog = {
        id: crypto.randomUUID(),
        product_id: match.id,
        branch_id: targetBranchId,
        sku: match.sku,
        name: match.name,
        size: match.size,
        color: match.color,
        previousStock: currentStock,
        newStock,
        delta,
        timestamp: new Date().toLocaleTimeString()
      };

      setScanLedger(prev => [log, ...prev]);
      playBeep("success");

      if (!isScanModalOpen) {
        setIsScanModalOpen(true);
      }
      setScanInput("");
      
      // Auto-focus input if open
      setTimeout(() => scanInputRef.current?.focus(), 50);
    } catch (err) {
      console.error(err);
      playBeep("error");
    }
  };

  // Undo scanner ledger adjustments
  const handleUndoScan = async (log: ScanLog) => {
    try {
      const ts = new Date().toISOString();
      const existing = inventory.find(i => i.product_id === log.product_id && i.branch_id === log.branch_id);

      if (existing) {
        await supabase.from('inventory').update({ stock: log.previousStock, last_updated: ts }).eq('id', existing.id);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      }

      setScanLedger(prev => prev.filter(x => x.id !== log.id));
      playBeep("success");
    } catch (err) {
      console.error("Undo adjustment failed", err);
      playBeep("error");
    }
  };

  // Global scanner listener hook (pauses when Add/CSV modals are active to prevent conflict)
  useEffect(() => {
    if (scanner.scanner_mode === "keyboard" && !isOpen && !csvUploadOpen) {
      const removeListener = initScannerDetector((barcode) => {
        handleBarcodeScanned(barcode);
      }, {
        scanner_suffix: scanner.scanner_suffix,
        scanner_min_speed_ms: scanner.scanner_min_speed_ms,
        scanner_prefix: scanner.scanner_prefix,
      });
      return removeListener;
    }
  }, [scanner, isOpen, csvUploadOpen, products, inventory, selectedBranchId, branchFilter, isScanModalOpen, scanMode]);

  // Export current list to CSV
  const exportInventoryCSV = () => {
    const targetBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : "");
    const activeBranchName = branches.find(b => b.id === targetBranchId)?.name || "Active_Branch";

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Product Name,Brand,Category,Size,Color,Price,GST %,Stock\n";

    filtered.forEach(p => {
      const stock = getBranchStock(p.id, targetBranchId || "");
      const row = [
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.brand.replace(/"/g, '""')}"`,
        `"${(p.category || "").replace(/"/g, '""')}"`,
        `"${p.size.replace(/"/g, '""')}"`,
        `"${(p.color || "").replace(/"/g, '""')}"`,
        p.price,
        p.gst_percent,
        stock
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billdale_inventory_${activeBranchName.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import adjustment parser
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert("The uploaded CSV file appears to be empty.");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const skuIdx = headers.indexOf("sku");
      const stockIdx = headers.indexOf("stock") !== -1 ? headers.indexOf("stock") : headers.findIndex(h => h.includes("stock"));

      if (skuIdx === -1 || stockIdx === -1) {
        alert("The CSV structure is invalid. Please make sure there is a 'SKU' and a 'Stock' column.");
        return;
      }

      const parsedRecords: CsvRecord[] = [];
      const targetBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : "");

      if (!targetBranchId) {
        alert("No active branch resolved. Select a branch before uploading CSV adjustments.");
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        const sku = cols[skuIdx];
        const stockStr = cols[stockIdx];

        if (!sku) continue;
        const stock = parseInt(stockStr) || 0;

        const match = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
        if (match) {
          const curStock = getBranchStock(match.id, targetBranchId);
          parsedRecords.push({
            sku,
            stock,
            productName: match.name,
            sizeColor: `${match.size}${match.color ? ` · ${match.color}` : ""}`,
            currentStock: curStock,
            newStock: stock
          });
        }
      }

      if (parsedRecords.length === 0) {
        alert("No matching items found. Ensure the CSV 'SKU' column matches your catalog SKUs.");
        return;
      }

      setCsvPreview(parsedRecords);
    };
    reader.readAsText(file);
  };

  // Commit CSV stock adjustments
  const confirmCSVImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setSubmitting(true);
    const ts = new Date().toISOString();
    const targetBranchId = branchFilter !== "all" ? branchFilter : selectedBranchId || (branches.length > 0 ? branches[0].id : "");

    if (!targetBranchId) return;

    try {
      for (const rec of csvPreview) {
        const match = products.find(p => p.sku.toLowerCase() === rec.sku.toLowerCase());
        if (!match) continue;

        const ex = inventory.find(i => i.product_id === match.id && i.branch_id === targetBranchId);
        if (ex) {
          await supabase.from('inventory').update({ stock: rec.newStock, last_updated: ts }).eq('id', ex.id);
        } else {
          const nw: Inventory = { id: crypto.randomUUID(), product_id: match.id, branch_id: targetBranchId, stock: rec.newStock, last_updated: ts };
          await supabase.from('inventory').insert(nw);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      alert(`Successfully synchronized stock adjustment for ${csvPreview.length} items!`);
      setCsvUploadOpen(false);
      setCsvPreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to commit CSV changes to database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (productId: string, branchId: string, stock: number) => {
    // If the branch being edited is NOT the currently locked terminal branch, require Admin PIN
    if (selectedBranchId && branchId !== selectedBranchId) {
      setPinForEdit({ productId, branchId, stock });
    } else {
      setEditCell({ productId, branchId });
      setEditVal(String(stock));
    }
  };

  const handlePinSuccessForEdit = () => {
    if (pinForEdit) {
      setEditCell({ productId: pinForEdit.productId, branchId: pinForEdit.branchId });
      setEditVal(String(pinForEdit.stock));
      setPinForEdit(null);
    }
  };

  const saveEdit = async () => {
    if (!editCell) return;
    const stock = Math.max(0, parseInt(editVal) || 0);
    const ts = new Date().toISOString();
    const ex = inventory.find(i => i.product_id === editCell.productId && i.branch_id === editCell.branchId);
    if (ex) {
      await supabase.from('inventory').update({ stock, last_updated: ts }).eq('id', ex.id);
    } else {
      const nw: Inventory = { id: crypto.randomUUID(), product_id: editCell.productId, branch_id: editCell.branchId, stock, last_updated: ts };
      await supabase.from('inventory').insert(nw);
    }
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    setEditCell(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branches.length === 0) { alert("Add a branch first."); return; }
    if (form.variants.length === 0 || form.variants.some(v => !v.size.trim() || !v.sku.trim())) { alert("All variants need Size and SKU."); return; }

    // Check if any variant has stock set for a branch other than the current terminal branch
    const hasOtherBranchStock = selectedBranchId && form.variants.some(v =>
      Object.entries(v.stockPerBranch).some(([bid, stockStr]) => bid !== selectedBranchId && (parseInt(stockStr) || 0) > 0)
    );

    if (hasOtherBranchStock) {
      // Show Admin PIN dialog first, actual save happens on pin success
      setPinForAddProduct(true);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const ts = new Date().toISOString();
    const base = getBase(form.price, form.gst_percent, form.price_includes_gst);
    try {
      if (!businessId) throw new Error("No business ID");
      for (const v of form.variants) {
        const p: Product = { id: crypto.randomUUID(), business_id: businessId, name: form.name, category: form.category, brand: form.brand, size: v.size, color: form.color, sku: v.sku, price: base, gst_percent: parseFloat(form.gst_percent), created_at: ts };
        await supabase.from('products').insert(p);
        for (const [bid, stockStr] of Object.entries(v.stockPerBranch)) {
          const inv: Inventory = { id: crypto.randomUUID(), product_id: p.id, branch_id: bid, stock: parseInt(stockStr) || 0, last_updated: ts };
          await supabase.from('inventory').insert(inv);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsOpen(false);
    } catch (err) { console.error(err); alert("Failed to save."); }
    finally { setSubmitting(false); }
  };

  const deleteProduct = (pid: string) => {
    if (needsDeleteApproval) {
      setPinForDelete(pid);
    } else {
      // Direct delete if approval not needed
      setPinForDelete(pid);
      doDeleteProduct(pid);
    }
  };

  const doDeleteProduct = async (pidOverride?: string) => {
    const pid = pidOverride || pinForDelete;
    if (!pid) return;
    await supabase.from('inventory').delete().eq('product_id', pid);
    await supabase.from('products').delete().eq('id', pid);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    setPinForDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Per-branch stock management</p>
        </div>
        <Button onClick={openDialog} className="gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
      </div>

      {/* Stats cards overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setActiveTabFilter("all")} className={cn("p-4 rounded-xl border text-left transition-all relative overflow-hidden group shadow-sm bg-card hover:border-primary/50", activeTabFilter === "all" ? "ring-2 ring-primary border-primary bg-primary/[0.02]" : "border-border/60")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total SKUs</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><ShoppingBag className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">{stats.totalProducts}</p>
          <div className="text-[10px] text-muted-foreground mt-1">Unique items in active branch</div>
        </button>
        
        <button onClick={() => setActiveTabFilter("all")} className={cn("p-4 rounded-xl border text-left transition-all relative overflow-hidden group shadow-sm bg-card hover:border-green-500/50", activeTabFilter === "all" ? "border-border/60" : "border-border/60")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Stock</span>
            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600"><Check className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-green-600">{stats.totalStock}</p>
          <div className="text-[10px] text-muted-foreground mt-1">Total items in active branch</div>
        </button>

        <button onClick={() => setActiveTabFilter("low")} className={cn("p-4 rounded-xl border text-left transition-all relative overflow-hidden group shadow-sm bg-card hover:border-amber-500/50", activeTabFilter === "low" ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/[0.02]" : "border-border/60")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock Items</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><AlertCircle className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-amber-600">{stats.lowStock}</p>
          <div className="text-[10px] text-muted-foreground mt-1">Stock level ≤ 5 units</div>
          {stats.lowStock > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-bl-lg" />}
        </button>

        <button onClick={() => setActiveTabFilter("out")} className={cn("p-4 rounded-xl border text-left transition-all relative overflow-hidden group shadow-sm bg-card hover:border-red-500/50", activeTabFilter === "out" ? "ring-2 ring-red-500 border-red-500 bg-red-500/[0.02]" : "border-border/60")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500"><X className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-red-500">{stats.outOfStock}</p>
          <div className="text-[10px] text-muted-foreground mt-1">Items at 0 stock count</div>
          {stats.outOfStock > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-bl-lg" />}
        </button>
      </div>

      {/* Search + Action tools bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU, brand…" className="pl-9 h-10 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          {branches.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Branch:</span>
              {[{ id: "all", name: "All Branches" }, ...branches].map(b => (
                <button key={b.id} onClick={() => setBranchFilter(b.id)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5",
                    branchFilter === b.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")}>
                  {b.id !== "all" && <Building2 className="w-3 h-3" />}
                  {b.name}
                  {b.id !== "all" && dbUser?.branch_id === b.id && <span className="bg-white/25 text-[9px] px-1.5 rounded-full font-bold">MY BRANCH</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frictionless operations block */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <Button onClick={() => { setIsScanModalOpen(true); setTimeout(() => scanInputRef.current?.focus(), 80); }} className="gap-2 h-10" variant="outline">
            <Barcode className="w-4 h-4" /> Scan Adjust
          </Button>
          <Button onClick={() => setCsvUploadOpen(true)} className="gap-2 h-10" variant="outline">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button onClick={exportInventoryCSV} className="gap-2 h-10" variant="outline">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {branches.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No branches yet. <button onClick={() => staffMode ? setPinForAddBranch(true) : router.push("/dashboard/branches")} className="underline font-semibold ml-1 hover:text-amber-800 transition-colors">Add a branch</button> before managing stock.
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-x-auto bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="text-xs font-bold uppercase tracking-wider">SKU</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Brand / Category</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Size / Color</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Price</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-center">GST</TableHead>
              {orderedBranches.map(b => (
                <TableHead key={b.id} className={cn("text-xs font-bold uppercase tracking-wider text-center min-w-[90px]", branchFilter === b.id && "text-primary")}>
                  <div className="flex flex-col items-center gap-0.5">
                    <Building2 className="w-3 h-3" />{b.name}
                    {branchFilter === b.id && <span className="text-[9px] normal-case text-primary font-bold">active</span>}
                  </div>
                </TableHead>
              ))}
              {branches.length > 1 && <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Total</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8 + orderedBranches.length} className="h-32 text-center text-muted-foreground text-sm">
                {products.length === 0 ? "No products yet. Click \"Add Product\" to get started." : "No results for your search."}
              </TableCell></TableRow>
            )}
            {filtered.map(p => {
              const total = getTotalStock(p.id);
              const inSelectedBranch = branchFilter !== "all" ? getBranchStock(p.id, branchFilter) : total;
              return (
                <TableRow key={p.id} className={cn("group", inSelectedBranch === 0 && branchFilter !== "all" && "opacity-60")}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.brand} / {p.category}</TableCell>
                  <TableCell className="text-xs">{p.size}{p.color && ` · ${p.color}`}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatINR(p.price)}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{p.gst_percent}%</TableCell>
                  {orderedBranches.map(b => {
                    const stock = getBranchStock(p.id, b.id);
                    const isEditing = editCell?.productId === p.id && editCell?.branchId === b.id;
                    return (
                      <TableCell key={b.id} className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input autoFocus type="number" min="0" value={editVal} onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditCell(null); }}
                              className="w-16 h-7 text-center text-xs p-1" />
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditCell(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <StockCell stock={stock} isSelected={branchFilter === b.id}
                            onEdit={() => handleEditClick(p.id, b.id, stock)} />
                        )}
                      </TableCell>
                    );
                  })}
                  {branches.length > 1 && (
                    <TableCell className="text-center">
                      <span className={cn("inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg text-xs font-bold", total === 0 ? "bg-red-500/10 text-red-500" : total <= 10 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary")}>
                        {total === 0 ? "—" : total}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <button onClick={() => deleteProduct(p.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) setForm({ name: "", category: "", brand: "", color: "", price: "", gst_percent: "18", price_includes_gst: false, variants: [] }); }}>
        <DialogContent className="bg-card border-border/60 w-[96vw] sm:max-w-5xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/10 sticky top-0 z-10">
            <DialogTitle className="font-black text-lg">Add New Product</DialogTitle>
            <p className="text-xs text-muted-foreground">Fill in product details, then set stock per branch for each size variant.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Product info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">Product Name *</Label>
                <Input placeholder="e.g. Air Jordan High 1 OG" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Brand *</Label>
                <Input placeholder="e.g. Nike" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Input placeholder="e.g. Sneakers" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Color</Label>
                <Input placeholder="e.g. Black" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price (₹) *</Label>
                <Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">GST %</Label>
                <Input type="number" placeholder="18" value={form.gst_percent} onChange={e => setForm(f => ({ ...f, gst_percent: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                <input type="checkbox" id="incGst" checked={form.price_includes_gst} onChange={e => setForm(f => ({ ...f, price_includes_gst: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <Label htmlFor="incGst" className="text-xs cursor-pointer">Price includes GST</Label>
              </div>
            </div>

            {/* Variants table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Size Variants &amp; Branch Stock</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Each size is saved as a separate product entry. Set initial stock per branch.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateAllSKUs} className="gap-1 text-xs h-8 text-primary hover:text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> Generate SKUs
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, variants: [...f.variants, newVariant()] }))} className="gap-1 text-xs h-8">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Size
                  </Button>
                </div>
              </div>

              {branches.length === 0 && (
                <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No branches. <a href="/dashboard/branches" className="underline">Add branches first</a> to set per-branch stock.
                </div>
              )}

              {form.variants.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Click &ldquo;Add Size&rdquo; to add size variants
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Size *</th>
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">SKU *</th>
                        {branches.map(b => (
                          <th key={b.id} className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[80px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <Building2 className="w-3 h-3" />{b.name}
                            </div>
                          </th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {form.variants.map((v, idx) => (
                        <tr key={v.id} className="hover:bg-muted/10">
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" placeholder="US 9" value={v.size}
                              onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, size: e.target.value } : x) }))} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <Input className="h-8 text-xs font-mono pr-8" placeholder="e.g. NIK-AJH-US9" value={v.sku}
                                onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, sku: e.target.value } : x) }))} />
                              <button type="button" onClick={() => {
                                if (form.brand && form.name && v.size) {
                                  const auto = generateSKU(form.brand, form.name, form.color, v.size);
                                  setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, sku: auto } : x) }));
                                } else {
                                  alert("Please fill in Name, Brand and Size first to generate.");
                                }
                              }} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1 rounded" title="Generate SKU">
                                <Sparkles className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          {branches.map(b => (
                            <td key={b.id} className="px-3 py-2">
                              <Input type="number" min="0" className="h-8 text-xs text-center w-20 mx-auto" placeholder="0"
                                value={v.stockPerBranch[b.id] ?? "0"}
                                onChange={e => setForm(f => ({ ...f, variants: f.variants.map(x => x.id === v.id ? { ...x, stockPerBranch: { ...x.stockPerBranch, [b.id]: e.target.value } } : x) }))} />
                            </td>
                          ))}
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => setForm(f => ({ ...f, variants: f.variants.filter(x => x.id !== v.id) }))}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="min-w-[120px]">
                {submitting ? "Saving…" : "Save Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Scan Stock Adjuster Console Dialog */}
      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent className="bg-card border-border/60 w-[96vw] sm:max-w-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/10 sticky top-0 z-10">
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Barcode className="w-5 h-5 text-primary" /> Barcode Scan Stock Adjustment
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Adjust stock instantly by scanning barcodes or typing product SKUs.</p>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adjustment Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "increment", label: "Add Stock (+1)", cls: "hover:border-green-500 hover:text-green-600", activeCls: "bg-green-500/10 text-green-600 border-green-500 hover:bg-green-500/15" },
                  { id: "decrement", label: "Reduce Stock (-1)", cls: "hover:border-red-500 hover:text-red-600", activeCls: "bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/15" },
                  { id: "set", label: "Set Quantity (=)", cls: "hover:border-blue-500 hover:text-blue-600", activeCls: "bg-blue-500/10 text-blue-600 border-blue-500 hover:bg-blue-500/15" }
                ].map(mode => (
                  <button key={mode.id} type="button" onClick={() => setScanMode(mode.id as any)}
                    className={cn("px-4 py-3 rounded-xl border font-bold text-xs transition-all shadow-sm flex items-center justify-center text-center", 
                      scanMode === mode.id ? mode.activeCls : "bg-background text-muted-foreground border-border/60 hover:bg-muted/30 " + mode.cls)}>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scan or Type Barcode / SKU</Label>
              <div className="relative">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-60" />
                <Input ref={scanInputRef} placeholder={scanMode === "set" ? "Scan/Enter SKU, then key in the count below..." : "Scan physical label or type SKU, hit Enter..."}
                  className="pl-12 h-14 text-lg font-mono bg-muted/20 border-border/80 rounded-xl focus-visible:ring-primary shadow-sm"
                  value={scanInput} onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && scanInput.trim()) {
                      e.preventDefault();
                      handleBarcodeScanned(scanInput);
                    }
                  }} autoFocus />
                {scanInput && (
                  <button onClick={() => setScanInput("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1 bg-muted/35 rounded-md px-2.5 py-1.5 border border-border/20">
                <Volume2 className="w-3.5 h-3.5 text-primary shrink-0" />
                Hardware scanner key listeners are active in the background. Scans will apply stock changes instantly.
              </p>
            </div>

            {/* Session adjustments list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adjustment History (This Session)</span>
                {scanLedger.length > 0 && (
                  <button onClick={() => setScanLedger([])} className="text-[10px] font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1">
                    Clear Logs
                  </button>
                )}
              </div>

              {scanLedger.length === 0 ? (
                <div className="border border-dashed border-border/60 rounded-xl py-12 text-center text-xs text-muted-foreground">
                  No adjustments recorded in this session. Start scanning products!
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/50 bg-muted/5">
                  {scanLedger.map(log => {
                    const isPlus = log.delta > 0;
                    return (
                      <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/10 transition-colors">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">{log.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {log.sku} · Size: {log.size} {log.color && `· ${log.color}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className={cn("inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px]", 
                              isPlus ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500")}>
                              {isPlus ? `+${log.delta}` : log.delta}
                            </span>
                            <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">Stock: {log.previousStock} → {log.newStock}</p>
                          </div>
                          <button onClick={() => handleUndoScan(log)} className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted transition-colors" title="Undo change">
                            <Undo className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/40 bg-muted/10">
            <Button onClick={() => setIsScanModalOpen(false)} className="w-full sm:w-28 font-bold">Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Adjustment Dialog */}
      <Dialog open={csvUploadOpen} onOpenChange={v => { setCsvUploadOpen(v); if (!v) setCsvPreview(null); }}>
        <DialogContent className="bg-card border-border/60 w-[96vw] sm:max-w-2xl p-0 overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/10 shrink-0">
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Import Stock adjustments (CSV)
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Upload a CSV file containing SKUs and Stock values to apply batch stock updates.</p>
          </DialogHeader>
          
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {!csvPreview ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center bg-muted/5 flex flex-col items-center justify-center gap-3">
                  <Upload className="w-10 h-10 text-muted-foreground/60" />
                  <div>
                    <p className="text-xs font-bold">Upload stockheet file (.csv)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Columns required: "SKU" and "Stock"</p>
                  </div>
                  <Input type="file" accept=".csv" className="hidden" id="csv-file-input" onChange={handleCSVImport} />
                  <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => document.getElementById("csv-file-input")?.click()}>
                    Select File
                  </Button>
                </div>
                
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Important Notice</p>
                    <p className="mt-0.5">Uploading adjustments will overwrite the stock values of matched products for the currently active branch in this browser session. Ensure your SKU names fully align with the database catalog.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preview adjustments ({csvPreview.length} items mapped)</p>
                <div className="border border-border/60 rounded-xl overflow-x-auto bg-card max-h-[300px]">
                  <Table>
                    <TableHeader className="bg-muted/15 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs font-bold">SKU</TableHead>
                        <TableHead className="text-xs font-bold">Product</TableHead>
                        <TableHead className="text-xs font-bold text-center">Current</TableHead>
                        <TableHead className="text-xs font-bold text-center">New Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((rec, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-semibold">{rec.sku}</TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold">{rec.productName}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{rec.sizeColor}</span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">{rec.currentStock}</TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold text-green-600 bg-green-500/5">{rec.newStock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/40 bg-muted/10 shrink-0">
            <Button variant="outline" onClick={() => { setCsvUploadOpen(false); setCsvPreview(null); }}>Cancel</Button>
            {csvPreview && (
              <Button onClick={confirmCSVImport} disabled={submitting} className="min-w-[120px]">
                {submitting ? "Processing…" : "Apply adjustments"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AdminPinDialog
        open={!!pinForEdit}
        title="Admin Access Required"
        onSuccess={handlePinSuccessForEdit}
        onClose={() => setPinForEdit(null)}
      />
      <AdminPinDialog
        open={pinForAddProduct}
        title="Admin Access Required"
        onSuccess={() => { setPinForAddProduct(false); doSubmit(); }}
        onClose={() => setPinForAddProduct(false)}
      />
      <AdminPinDialog
        open={!!pinForDelete}
        title="Confirm Product Deletion"
        onSuccess={() => doDeleteProduct()}
        onClose={() => setPinForDelete(null)}
      />
      <AdminPinDialog
        open={pinForAddBranch}
        title="Admin Access Required"
        onSuccess={(unlockUntil) => { 
          setPinForAddBranch(false); 
          setStaffMode(false, unlockUntil);
          router.push("/dashboard/branches");
        }}
        onClose={() => setPinForAddBranch(false)}
      />
    </div>
  );
}
