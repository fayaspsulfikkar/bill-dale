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

/** PDF-safe currency: jsPDF Helvetica doesn't have ₹ — use "Rs." prefix */
function rs(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Same but no "Rs." for inside tables where header already says (Rs.) */
function num(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── CSV EXPORT ───────────────────────────────────────────────
export function exportCSV(data: ExportData) {
  const { invoices, invoiceItems, products, branches, returnOrders, dateRange, businessName, branchLabel } = data;
  const invoiceIds = new Set(invoices.map(i => i.id));
  const filteredItems = invoiceItems.filter(ii => invoiceIds.has(ii.invoice_id));

  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0)
    + filteredItems.reduce((s, ii) => s + (ii.item_discount || 0), 0);
  const totalReturns = returnOrders.reduce((s, r) => s + r.refund_amount, 0);
  const itemsSold = filteredItems.reduce((s, ii) => s + ii.quantity, 0);
  const avgOrder = invoices.length > 0 ? totalRevenue / invoices.length : 0;

  const L: string[] = [];
  L.push(`"${businessName} - Dashboard Report"`);
  L.push(`"Period","${dateRange.label}"`);
  L.push(`"Branch","${branchLabel}"`);
  L.push(`"Generated","${format(new Date(), "dd MMM yyyy, hh:mm a")}"`);
  L.push(``);
  L.push(`"SUMMARY"`);
  L.push(`"Metric","Value"`);
  L.push(`"Total Revenue","${totalRevenue.toFixed(2)}"`);
  L.push(`"Total Orders","${invoices.length}"`);
  L.push(`"Avg Order Value","${avgOrder.toFixed(2)}"`);
  L.push(`"Items Sold","${itemsSold}"`);
  L.push(`"Discounts Given","${totalDiscount.toFixed(2)}"`);
  L.push(`"Tax Collected","${totalTax.toFixed(2)}"`);
  L.push(`"Returns / Refunds","${totalReturns.toFixed(2)}"`);
  L.push(`"Net Sales","${(totalRevenue - totalDiscount - totalReturns).toFixed(2)}"`);

  // Payment breakdown
  L.push(``);
  L.push(`"PAYMENT BREAKDOWN"`);
  L.push(`"Method","Amount","Transactions"`);
  const pmMap: Record<string, { amount: number; count: number }> = {};
  invoices.forEach(i => {
    const m = i.payment_method || "cash";
    if (!pmMap[m]) pmMap[m] = { amount: 0, count: 0 };
    pmMap[m].amount += i.total_amount;
    pmMap[m].count++;
  });
  Object.entries(pmMap).sort((a, b) => b[1].amount - a[1].amount).forEach(([m, d]) => {
    L.push(`"${m.toUpperCase()}","${d.amount.toFixed(2)}","${d.count}"`);
  });

  // Staff sales
  const staffMap: Record<string, { orders: number; revenue: number }> = {};
  invoices.forEach(i => {
    const name = i.staff_name || "Unassigned";
    if (!staffMap[name]) staffMap[name] = { orders: 0, revenue: 0 };
    staffMap[name].orders++;
    staffMap[name].revenue += i.total_amount;
  });
  if (Object.keys(staffMap).length > 0) {
    L.push(``);
    L.push(`"STAFF SALES"`);
    L.push(`"Staff","Orders","Revenue"`);
    Object.entries(staffMap).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([name, d]) => {
      L.push(`"${name}","${d.orders}","${d.revenue.toFixed(2)}"`);
    });
  }

  // Top products
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
    L.push(``);
    L.push(`"TOP PRODUCTS"`);
    L.push(`"Product","SKU","Units Sold","Revenue"`);
    topProducts.forEach(p => {
      L.push(`"${p.name}","${p.sku}","${p.units}","${p.revenue.toFixed(2)}"`);
    });
  }

  // Invoice detail
  L.push(``);
  L.push(`"INVOICE DETAIL"`);
  L.push(`"Invoice #","Date","Time","Staff","Customer","Amount","Tax","Discount","Payment","Branch"`);
  invoices.forEach(i => {
    const branch = branches.find(b => b.id === i.branch_id);
    const dt = new Date(i.created_at);
    L.push([
      `"${i.invoice_number || i.id.slice(0, 8)}"`,
      `"${format(dt, "dd MMM yyyy")}"`,
      `"${format(dt, "hh:mm a")}"`,
      `"${i.staff_name || "-"}"`,
      `"${i.customer_id || "Walk-in"}"`,
      `"${i.total_amount.toFixed(2)}"`,
      `"${(i.tax_amount || 0).toFixed(2)}"`,
      `"${(i.discount || 0).toFixed(2)}"`,
      `"${i.payment_method.toUpperCase()}"`,
      `"${branch?.name || ""}"`,
    ].join(","));
  });

  const csv = L.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
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
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 16; // margin left
  const MR = PW - 16; // margin right
  const CW = MR - ML; // content width

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

  // Colors
  const PRIMARY: [number, number, number] = [79, 70, 229];
  const DARK: [number, number, number] = [30, 30, 46];
  const MUTED: [number, number, number] = [120, 120, 140];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT: [number, number, number] = [246, 246, 252];
  const GREEN_C: [number, number, number] = [22, 163, 74];
  const RED_C: [number, number, number] = [220, 38, 38];

  // Helper: section title with accent line
  function sectionTitle(title: string, yPos: number): number {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(title, ML, yPos);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.6);
    doc.line(ML, yPos + 1.5, ML + 30, yPos + 1.5);
    return yPos + 6;
  }

  // Helper: check page break
  function checkPage(yPos: number, need: number): number {
    if (yPos + need > PH - 20) {
      doc.addPage();
      return 18;
    }
    return yPos;
  }

  // ═══ HEADER BAND ═══
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PW, 32, "F");
  // Subtle gradient overlay
  doc.setFillColor(0, 0, 0);
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  doc.rect(0, 24, PW, 8, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(businessName.toUpperCase(), ML, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BUSINESS PERFORMANCE REPORT", ML, 21);

  // Right side metadata
  doc.setFontSize(8);
  doc.text(dateRange.label, MR, 12, { align: "right" });
  doc.text(`Branch: ${branchLabel}`, MR, 17, { align: "right" });
  doc.text(format(new Date(), "dd MMM yyyy, hh:mm a"), MR, 22, { align: "right" });

  // Thin accent line at bottom of header
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.rect(0, 30, PW, 0.5, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // ═══ KPI CARDS ═══
  let y = 40;
  y = sectionTitle("Key Metrics", y);

  const kpis = [
    { label: "TOTAL REVENUE", value: rs(totalRevenue) },
    { label: "TOTAL ORDERS", value: invoices.length.toLocaleString("en-IN") },
    { label: "AVG ORDER VALUE", value: rs(avgOrder) },
    { label: "ITEMS SOLD", value: itemsSold.toLocaleString("en-IN") },
    { label: "TAX COLLECTED", value: rs(totalTax) },
    { label: "DISCOUNTS", value: rs(totalDiscount) },
    { label: "RETURNS", value: rs(totalReturns) },
    { label: "NET SALES", value: rs(netSales) },
  ];

  const gap = 4;
  const cardW = (CW - gap * 3) / 4;
  const cardH = 16;

  kpis.forEach((kpi, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = ML + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    // Card background
    doc.setFillColor(...LIGHT);
    doc.roundedRect(cx, cy, cardW, cardH, 1.5, 1.5, "F");
    // Left accent bar
    doc.setFillColor(...PRIMARY);
    doc.rect(cx, cy + 2, 0.8, cardH - 4, "F");

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(kpi.label, cx + 4, cy + 5.5);

    // Value
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(kpi.value, cx + 4, cy + 12);
  });
  y += (cardH + gap) * 2 + 6;

  // ═══ REVENUE BREAKDOWN ═══
  y = checkPage(y, 50);
  y = sectionTitle("Revenue Breakdown", y);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Amount (Rs.)"]],
    body: [
      ["Gross Sales (Revenue + Discounts)", num(totalRevenue + totalDiscount)],
      ["Less: Discounts", `- ${num(totalDiscount)}`],
      ["Less: Returns / Refunds", `- ${num(totalReturns)}`],
      ["Net Sales", num(netSales)],
      ["GST Collected", num(totalTax)],
      ["Total Amount Received", num(totalRevenue)],
    ],
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }, lineColor: [230, 230, 240], lineWidth: 0.3 },
    headStyles: { fillColor: LIGHT, textColor: MUTED, fontStyle: "bold", fontSize: 7.5 },
    bodyStyles: { textColor: DARK },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: CW * 0.6 },
      1: { halign: "right", cellWidth: CW * 0.4, font: "courier" },
    },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    margin: { left: ML, right: PW - MR },
    tableWidth: CW,
    didParseCell: (data: any) => {
      // Bold last two rows
      if (data.section === "body" && data.row.index >= 3) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ═══ PAYMENT METHODS ═══
  const pmMap: Record<string, { amount: number; count: number }> = {};
  invoices.forEach(i => {
    const m = i.payment_method || "cash";
    if (!pmMap[m]) pmMap[m] = { amount: 0, count: 0 };
    pmMap[m].amount += i.total_amount;
    pmMap[m].count++;
  });
  const pmRows = Object.entries(pmMap).sort((a, b) => b[1].amount - a[1].amount);

  if (pmRows.length > 0) {
    y = checkPage(y, 40);
    y = sectionTitle("Payment Methods", y);

    autoTable(doc, {
      startY: y,
      head: [["Method", "Amount (Rs.)", "Txns", "Share"]],
      body: pmRows.map(([m, d]) => [
        m.charAt(0).toUpperCase() + m.slice(1).replace("_", " "),
        num(d.amount),
        d.count.toString(),
        totalRevenue > 0 ? `${((d.amount / totalRevenue) * 100).toFixed(1)}%` : "0%",
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 235], lineWidth: 0.3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: DARK },
      columnStyles: {
        1: { halign: "right", font: "courier" },
        2: { halign: "center" },
        3: { halign: "right" },
      },
      margin: { left: ML, right: PW - MR },
      tableWidth: CW,
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══ STAFF PERFORMANCE ═══
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
    y = checkPage(y, 40);
    y = sectionTitle("Staff Performance", y);

    autoTable(doc, {
      startY: y,
      head: [["#", "Staff Name", "Orders", "Revenue (Rs.)", "Discounts (Rs.)", "Avg Order (Rs.)"]],
      body: staffRows.map(([name, d], i) => [
        (i + 1).toString(),
        name,
        d.orders.toString(),
        num(d.revenue),
        num(d.discounts),
        num(d.orders > 0 ? d.revenue / d.orders : 0),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 235], lineWidth: 0.3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: DARK },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        3: { halign: "right", font: "courier" },
        4: { halign: "right", font: "courier" },
        5: { halign: "right", font: "courier" },
      },
      margin: { left: ML, right: PW - MR },
      tableWidth: CW,
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══ TOP PRODUCTS ═══
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
      return { name: prod?.name || "Unknown", sku: prod?.sku || "-", ...d };
    });

  if (topProducts.length > 0) {
    y = checkPage(y, 40);
    y = sectionTitle("Top Selling Products", y);

    autoTable(doc, {
      startY: y,
      head: [["#", "Product Name", "SKU", "Qty Sold", "Revenue (Rs.)"]],
      body: topProducts.map((p, i) => [
        (i + 1).toString(),
        p.name,
        p.sku,
        p.units.toString(),
        num(p.revenue),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 235], lineWidth: 0.3 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: DARK },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        3: { halign: "center" },
        4: { halign: "right", font: "courier" },
      },
      margin: { left: ML, right: PW - MR },
      tableWidth: CW,
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══ INVOICE DETAIL ═══
  if (invoices.length > 0) {
    y = checkPage(y, 40);
    y = sectionTitle(`Invoice Detail (${Math.min(invoices.length, 100)} of ${invoices.length})`, y);

    autoTable(doc, {
      startY: y,
      head: [["Invoice #", "Date", "Time", "Staff", "Amount (Rs.)", "Tax (Rs.)", "Discount (Rs.)", "Payment"]],
      body: invoices.slice(0, 100).map(i => {
        const dt = new Date(i.created_at);
        return [
          i.invoice_number || i.id.slice(0, 8),
          format(dt, "dd MMM yy"),
          format(dt, "hh:mm a"),
          i.staff_name || "-",
          num(i.total_amount),
          num(i.tax_amount || 0),
          num(i.discount || 0),
          i.payment_method.toUpperCase(),
        ];
      }),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2, lineColor: [230, 230, 240], lineWidth: 0.2 },
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
      bodyStyles: { textColor: DARK },
      columnStyles: {
        4: { halign: "right", font: "courier" },
        5: { halign: "right", font: "courier" },
        6: { halign: "right", font: "courier" },
      },
      alternateRowStyles: { fillColor: [250, 250, 254] },
      margin: { left: ML, right: PW - MR },
      tableWidth: CW,
    });
  }

  // ═══ FOOTER ON EVERY PAGE ═══
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom accent line
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.4);
    doc.line(ML, PH - 12, MR, PH - 12);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`${businessName}  |  Confidential  |  Generated ${format(new Date(), "dd MMM yyyy")}`, ML, PH - 7);
    doc.text(`Page ${p} of ${totalPages}`, MR, PH - 7, { align: "right" });
  }

  doc.save(`${businessName.replace(/\s/g, "_")}_Report_${format(new Date(), "dd-MMM-yyyy")}.pdf`);
}
