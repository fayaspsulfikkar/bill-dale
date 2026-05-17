import { formatINR } from "@/lib/formatCurrency";
import type { Invoice, Branch, InvoiceItem, Product, ReturnOrder } from "@/offline/db";
import { format } from "date-fns";
import type { DateRange } from "@/components/dashboard/DateRangeFilter";

interface ExportData {
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  products: Product[];
  branches: Branch[];
  returnOrders: ReturnOrder[];
  dateRange: DateRange;
  businessName: string;
  branchLabel: string;
}

// ─── CSV EXPORT ───────────────────────────────────────────────
export function exportCSV(data: ExportData) {
  const { invoices, invoiceItems, products, branches, returnOrders, dateRange, businessName, branchLabel } = data;
  const invoiceIds = new Set(invoices.map(i => i.id));
  const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));

  // --- Sheet 1: Summary ---
  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0)
    + filteredItems.reduce((s, ii) => s + (ii.item_discount || 0), 0);
  const totalReturns = returnOrders.reduce((s, r) => s + r.refund_amount, 0);
  const itemsSold = filteredItems.reduce((s, ii) => s + ii.quantity, 0);
  const avgOrder = invoices.length > 0 ? totalRevenue / invoices.length : 0;

  const lines: string[] = [];
  lines.push(`"${businessName} — Dashboard Report"`);
  lines.push(`"Period","${dateRange.label}"`);
  lines.push(`"Branch","${branchLabel}"`);
  lines.push(`"Generated","${format(new Date(), "dd MMM yyyy, hh:mm a")}"`);
  lines.push(``);
  lines.push(`"SUMMARY"`);
  lines.push(`"Metric","Value"`);
  lines.push(`"Total Revenue","${totalRevenue.toFixed(2)}"`);
  lines.push(`"Total Orders","${invoices.length}"`);
  lines.push(`"Avg Order Value","${avgOrder.toFixed(2)}"`);
  lines.push(`"Items Sold","${itemsSold}"`);
  lines.push(`"Discounts Given","${totalDiscount.toFixed(2)}"`);
  lines.push(`"Tax Collected","${totalTax.toFixed(2)}"`);
  lines.push(`"Returns / Refunds","${totalReturns.toFixed(2)}"`);
  lines.push(`"Net Sales","${(totalRevenue - totalDiscount - totalReturns).toFixed(2)}"`);

  // --- Payment breakdown ---
  lines.push(``);
  lines.push(`"PAYMENT BREAKDOWN"`);
  lines.push(`"Method","Amount","Transactions"`);
  const pmMap: Record<string, { amount: number; count: number }> = {};
  invoices.forEach(i => {
    const m = i.payment_method || "cash";
    if (!pmMap[m]) pmMap[m] = { amount: 0, count: 0 };
    pmMap[m].amount += i.total_amount;
    pmMap[m].count++;
  });
  Object.entries(pmMap).sort((a, b) => b[1].amount - a[1].amount).forEach(([m, d]) => {
    lines.push(`"${m.toUpperCase()}","${d.amount.toFixed(2)}","${d.count}"`);
  });

  // --- Staff performance ---
  const staffMap: Record<string, { orders: number; revenue: number }> = {};
  invoices.forEach(i => {
    const name = i.staff_name || "Unassigned";
    if (!staffMap[name]) staffMap[name] = { orders: 0, revenue: 0 };
    staffMap[name].orders++;
    staffMap[name].revenue += i.total_amount;
  });
  if (Object.keys(staffMap).length > 0) {
    lines.push(``);
    lines.push(`"STAFF SALES"`);
    lines.push(`"Staff","Orders","Revenue"`);
    Object.entries(staffMap).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([name, d]) => {
      lines.push(`"${name}","${d.orders}","${d.revenue.toFixed(2)}"`);
    });
  }

  // --- Top products ---
  const prodMap: Record<string, { units: number; revenue: number }> = {};
  filteredItems.forEach(ii => {
    if (!prodMap[ii.product_id]) prodMap[ii.product_id] = { units: 0, revenue: 0 };
    prodMap[ii.product_id].units += ii.quantity;
    prodMap[ii.product_id].revenue += ii.price * ii.quantity;
  });
  const topProducts = Object.entries(prodMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20)
    .map(([pid, d]) => {
      const prod = products.find(p => p.id === pid);
      return { name: prod?.name || "Unknown", sku: prod?.sku || "", ...d };
    });
  if (topProducts.length > 0) {
    lines.push(``);
    lines.push(`"TOP PRODUCTS"`);
    lines.push(`"Product","SKU","Units Sold","Revenue"`);
    topProducts.forEach(p => {
      lines.push(`"${p.name}","${p.sku}","${p.units}","${p.revenue.toFixed(2)}"`);
    });
  }

  // --- Invoice detail ---
  lines.push(``);
  lines.push(`"INVOICE DETAIL"`);
  lines.push(`"Invoice #","Date","Time","Staff","Customer","Amount","Tax","Discount","Payment","Branch"`);
  invoices.forEach(i => {
    const branch = branches.find(b => b.id === i.branch_id);
    const dt = new Date(i.created_at);
    lines.push([
      `"${i.invoice_number || i.id.slice(0, 8)}"`,
      `"${format(dt, "dd MMM yyyy")}"`,
      `"${format(dt, "hh:mm a")}"`,
      `"${i.staff_name || "—"}"`,
      `"${i.customer_id || "Walk-in"}"`,
      `"${i.total_amount.toFixed(2)}"`,
      `"${(i.tax_amount || 0).toFixed(2)}"`,
      `"${(i.discount || 0).toFixed(2)}"`,
      `"${i.payment_method.toUpperCase()}"`,
      `"${branch?.name || ""}"`,
    ].join(","));
  });

  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${businessName.replace(/\s/g, "_")}_Report_${format(new Date(), "dd-MMM-yyyy")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF EXPORT ───────────────────────────────────────────────
export async function exportPDF(data: ExportData) {
  const { invoices, invoiceItems, products, branches, returnOrders, dateRange, businessName, branchLabel } = data;
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const invoiceIds = new Set(invoices.map(i => i.id));
  const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));
  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0)
    + filteredItems.reduce((s, ii) => s + (ii.item_discount || 0), 0);
  const totalReturns = returnOrders.reduce((s, r) => s + r.refund_amount, 0);
  const itemsSold = filteredItems.reduce((s, ii) => s + ii.quantity, 0);
  const avgOrder = invoices.length > 0 ? totalRevenue / invoices.length : 0;
  const netSales = totalRevenue - totalDiscount - totalReturns;

  // --- Colors ---
  const PRIMARY: [number, number, number] = [79, 70, 229]; // indigo-600
  const DARK: [number, number, number] = [30, 30, 46];
  const MUTED: [number, number, number] = [120, 120, 140];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT_BG: [number, number, number] = [245, 245, 250];
  const GREEN: [number, number, number] = [34, 197, 94];
  const RED: [number, number, number] = [239, 68, 68];

  // ─── Header Band ───
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(businessName.toUpperCase(), 14, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Business Performance Report", 14, 24);

  doc.setFontSize(9);
  doc.text(`Period: ${dateRange.label}  |  Branch: ${branchLabel}`, 14, 31);

  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageW - 14, 31, { align: "right" });

  // ─── KPI Summary Cards ───
  let y = 44;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Key Metrics", 14, y);
  y += 6;

  const kpis = [
    { label: "Total Revenue", value: formatINR(totalRevenue), color: PRIMARY },
    { label: "Total Orders", value: invoices.length.toString(), color: DARK },
    { label: "Avg Order", value: formatINR(avgOrder), color: DARK },
    { label: "Items Sold", value: itemsSold.toLocaleString("en-IN"), color: DARK },
    { label: "Tax Collected", value: formatINR(totalTax), color: MUTED },
    { label: "Discounts", value: formatINR(totalDiscount), color: RED },
    { label: "Returns", value: formatINR(totalReturns), color: RED },
    { label: "Net Sales", value: formatINR(netSales), color: GREEN },
  ];

  const cardW = (pageW - 28 - 21) / 4; // 4 columns, 14px margin each side, 7px gap
  kpis.forEach((kpi, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = 14 + col * (cardW + 7);
    const cy = y + row * 20;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(cx, cy, cardW, 17, 2, 2, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(kpi.label.toUpperCase(), cx + 4, cy + 6);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, cx + 4, cy + 13);
  });
  y += 44;

  // ─── Revenue Summary ───
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Revenue Breakdown", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["", "Amount"]],
    body: [
      ["Gross Sales", formatINR(totalRevenue + totalDiscount)],
      ["Discounts", `- ${formatINR(totalDiscount)}`],
      ["Returns / Refunds", `- ${formatINR(totalReturns)}`],
      ["Net Sales", formatINR(netSales)],
      ["GST Collected", formatINR(totalTax)],
      ["Total Paid", formatINR(totalRevenue)],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: LIGHT_BG, textColor: MUTED, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { halign: "right" } },
    alternateRowStyles: { fillColor: [250, 250, 254] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── Payment Breakdown ───
  const pmMap: Record<string, { amount: number; count: number }> = {};
  invoices.forEach(i => {
    const m = i.payment_method || "cash";
    if (!pmMap[m]) pmMap[m] = { amount: 0, count: 0 };
    pmMap[m].amount += i.total_amount;
    pmMap[m].count++;
  });
  const pmRows = Object.entries(pmMap).sort((a, b) => b[1].amount - a[1].amount);

  if (pmRows.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 16; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Payment Methods", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Method", "Amount", "Transactions", "% of Revenue"]],
      body: pmRows.map(([m, d]) => [
        m.charAt(0).toUpperCase() + m.slice(1).replace("_", " "),
        formatINR(d.amount),
        d.count.toString(),
        totalRevenue > 0 ? `${((d.amount / totalRevenue) * 100).toFixed(1)}%` : "0%",
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "center" }, 3: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Staff Sales ───
  const staffMap: Record<string, { orders: number; revenue: number; discounts: number }> = {};
  invoices.forEach(i => {
    const name = i.staff_name || "Unassigned";
    if (!staffMap[name]) staffMap[name] = { orders: 0, revenue: 0, discounts: 0 };
    staffMap[name].orders++;
    staffMap[name].revenue += i.total_amount;
    staffMap[name].discounts += i.discount || 0;
  });
  const staffRows = Object.entries(staffMap).sort((a, b) => b[1].revenue - a[1].revenue);

  if (staffRows.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 16; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Staff Performance", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["#", "Staff", "Orders", "Revenue", "Discounts", "Avg Order"]],
      body: staffRows.map(([name, d], i) => [
        (i + 1).toString(),
        name,
        d.orders.toString(),
        formatINR(d.revenue),
        formatINR(d.discounts),
        formatINR(d.orders > 0 ? d.revenue / d.orders : 0),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Top Products ───
  const prodMap: Record<string, { units: number; revenue: number }> = {};
  filteredItems.forEach(ii => {
    if (!prodMap[ii.product_id]) prodMap[ii.product_id] = { units: 0, revenue: 0 };
    prodMap[ii.product_id].units += ii.quantity;
    prodMap[ii.product_id].revenue += ii.price * ii.quantity;
  });
  const topProducts = Object.entries(prodMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 15)
    .map(([pid, d]) => {
      const prod = products.find(p => p.id === pid);
      return { name: prod?.name || "Unknown", sku: prod?.sku || "—", ...d };
    });

  if (topProducts.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = 16; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Top Selling Products", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["#", "Product", "SKU", "Units Sold", "Revenue"]],
      body: topProducts.map((p, i) => [
        (i + 1).toString(),
        p.name,
        p.sku,
        p.units.toString(),
        formatINR(p.revenue),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "center" }, 4: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Invoice Detail ───
  if (invoices.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = 16; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`Invoice Detail (${Math.min(invoices.length, 100)} of ${invoices.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Invoice #", "Date", "Time", "Staff", "Amount", "Tax", "Discount", "Payment"]],
      body: invoices.slice(0, 100).map(i => {
        const dt = new Date(i.created_at);
        return [
          i.invoice_number || i.id.slice(0, 8),
          format(dt, "dd MMM yy"),
          format(dt, "hh:mm a"),
          i.staff_name || "—",
          formatINR(i.total_amount),
          formatINR(i.tax_amount || 0),
          formatINR(i.discount || 0),
          i.payment_method.toUpperCase(),
        ];
      }),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
  }

  // ─── Footer on every page ───
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${businessName} — Confidential`, 14, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 6, { align: "right" });
    // Bottom accent line
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(14, pageH - 10, pageW - 14, pageH - 10);
  }

  doc.save(`${businessName.replace(/\s/g, "_")}_Report_${format(new Date(), "dd-MMM-yyyy")}.pdf`);
}
