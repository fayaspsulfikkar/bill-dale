import { Invoice } from "@/offline/db";
import { format } from "date-fns";

interface PrintItem {
  product: {
    name: string;
    sku: string;
    brand?: string;
    size?: string;
    color?: string;
    price: number;
    gst_percent: number;
  };
  quantity: number;
}

export function PrintA4Invoice({
  invoice,
  items,
  amountTendered,
  changeDue,
  businessName = "BILL-DALE",
}: {
  invoice: Invoice;
  items: PrintItem[];
  amountTendered?: number;
  changeDue?: number;
  businessName?: string;
}) {
  const subtotal = items.reduce((s, it) => s + it.product.price * it.quantity, 0);
  const totalTax = items.reduce((s, it) => s + (it.product.price * it.quantity * it.product.gst_percent) / 100, 0);
  const invoiceNo = invoice.id.slice(0, 8).toUpperCase();
  const dateStr = format(new Date(invoice.created_at), "dd MMM yyyy");
  const timeStr = format(new Date(invoice.created_at), "hh:mm a");

  const col = {
    accent: "#1a1a2e",
    accentLight: "#f0f4ff",
    border: "#e2e8f0",
    muted: "#64748b",
    green: "#16a34a",
    text: "#0f172a",
    label: "#94a3b8",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: `1px solid ${col.border}`,
  };

  const tdBase: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: "9.5pt",
    color: col.text,
    verticalAlign: "middle",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "7.5pt",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    color: col.label,
    marginBottom: "4px",
  };

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "14mm 16mm",
        background: "#ffffff",
        color: col.text,
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: "10pt",
        lineHeight: "1.5",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10mm",
        }}
      >
        {/* Brand block */}
        <div>
          <div
            style={{
              fontSize: "26pt",
              fontWeight: 900,
              letterSpacing: "-1px",
              color: col.accent,
              lineHeight: 1,
            }}
          >
            {businessName}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "6px",
              background: col.accent,
              color: "#fff",
              fontSize: "7pt",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "2px",
            }}
          >
            POINT OF SALE
          </div>
        </div>

        {/* Invoice meta */}
        <div
          style={{
            background: col.accentLight,
            border: `1px solid ${col.border}`,
            borderRadius: "8px",
            padding: "14px 20px",
            textAlign: "right",
            minWidth: "160px",
          }}
        >
          <div style={{ fontSize: "8pt", fontWeight: 700, color: col.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>
            TAX INVOICE
          </div>
          <div style={{ fontSize: "16pt", fontWeight: 900, color: col.accent, letterSpacing: "1px", fontFamily: "monospace" }}>
            #{invoiceNo}
          </div>
          <div style={{ marginTop: "8px", fontSize: "8.5pt", color: col.muted }}>
            <div>{dateStr}</div>
            <div>{timeStr}</div>
          </div>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div style={{ height: "2px", background: `linear-gradient(to right, ${col.accent}, ${col.border})`, marginBottom: "8mm" }} />

      {/* ── Customer + Payment ─────────────────────────────── */}
      <div style={{ display: "flex", gap: "8mm", marginBottom: "8mm" }}>
        {/* Customer */}
        <div style={{ flex: 1, background: "#f8fafc", border: `1px solid ${col.border}`, borderRadius: "6px", padding: "12px 16px" }}>
          <div style={labelStyle}>Billed To</div>
          <div style={{ fontWeight: 700, fontSize: "11pt", color: col.text }}>Walk-in Customer</div>
          <div style={{ fontSize: "8.5pt", color: col.muted, marginTop: "2px" }}>
            Cash / Counter Sale
          </div>
        </div>

        {/* Payment details */}
        <div style={{ flex: 1, background: "#f8fafc", border: `1px solid ${col.border}`, borderRadius: "6px", padding: "12px 16px" }}>
          <div style={labelStyle}>Payment Details</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "8.5pt", color: col.muted }}>Method</span>
            <span style={{ fontWeight: 700, fontSize: "8.5pt", textTransform: "uppercase", color: col.accent }}>
              {invoice.payment_method}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "8.5pt", color: col.muted }}>Status</span>
            <span style={{ fontWeight: 700, fontSize: "8.5pt", textTransform: "uppercase", color: col.green }}>
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Items Table ─────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm", fontSize: "9pt" }}>
        <thead>
          <tr style={{ background: col.accent }}>
            {["Item / Description", "Size", "Qty", "Unit Price", "GST", "Total"].map((h, i) => (
              <th
                key={h}
                style={{
                  padding: "9px 12px",
                  fontWeight: 700,
                  fontSize: "7.5pt",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "#ffffff",
                  textAlign: i === 0 ? "left" : "right",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const lineBase = item.product.price * item.quantity;
            const lineTax = (lineBase * item.product.gst_percent) / 100;
            const lineTotal = lineBase + lineTax;
            return (
              <tr key={idx} style={{ ...rowStyle, background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <td style={{ ...tdBase, textAlign: "left" }}>
                  <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                  {item.product.brand && (
                    <div style={{ fontSize: "8pt", color: col.muted }}>{item.product.brand}</div>
                  )}
                  <div style={{ fontSize: "7.5pt", color: col.label, fontFamily: "monospace" }}>
                    SKU: {item.product.sku}
                  </div>
                </td>
                <td style={{ ...tdBase, textAlign: "right", color: col.muted, fontSize: "9pt" }}>
                  {item.product.size || "—"}
                </td>
                <td style={{ ...tdBase, textAlign: "right", fontWeight: 700 }}>{item.quantity}</td>
                <td style={{ ...tdBase, textAlign: "right" }}>₹{item.product.price.toFixed(2)}</td>
                <td style={{ ...tdBase, textAlign: "right", color: col.muted }}>
                  <div>{item.product.gst_percent}%</div>
                  <div style={{ fontSize: "8pt" }}>₹{lineTax.toFixed(2)}</div>
                </td>
                <td style={{ ...tdBase, textAlign: "right", fontWeight: 700 }}>₹{lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totals ──────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10mm" }}>
        <div
          style={{
            width: "240px",
            border: `1px solid ${col.border}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Subtotal */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
            <span style={{ fontSize: "9pt", color: col.muted }}>Subtotal</span>
            <span style={{ fontSize: "9pt", fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
          </div>
          {/* Tax */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
            <span style={{ fontSize: "9pt", color: col.muted }}>GST (Tax)</span>
            <span style={{ fontSize: "9pt", fontWeight: 600 }}>₹{totalTax.toFixed(2)}</span>
          </div>
          {/* Discount */}
          {invoice.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
              <span style={{ fontSize: "9pt", color: col.green }}>Discount</span>
              <span style={{ fontSize: "9pt", fontWeight: 600, color: col.green }}>−₹{invoice.discount.toFixed(2)}</span>
            </div>
          )}
          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: col.accent,
            }}
          >
            <span style={{ fontSize: "10pt", fontWeight: 900, color: "#ffffff" }}>TOTAL DUE</span>
            <span style={{ fontSize: "14pt", fontWeight: 900, color: "#ffffff" }}>₹{invoice.total_amount.toFixed(2)}</span>
          </div>

          {/* Cash change if applicable */}
          {invoice.payment_method === "cash" && amountTendered !== undefined && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 16px", background: "#f0fdf4", borderTop: `1px solid #bbf7d0` }}>
                <span style={{ fontSize: "8.5pt", color: col.muted }}>Amount Tendered</span>
                <span style={{ fontSize: "8.5pt", fontWeight: 600 }}>₹{amountTendered.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 16px", background: "#f0fdf4" }}>
                <span style={{ fontSize: "8.5pt", fontWeight: 700, color: col.green }}>Change Returned</span>
                <span style={{ fontSize: "8.5pt", fontWeight: 700, color: col.green }}>₹{(changeDue ?? 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div
        style={{
          borderTop: `2px solid ${col.border}`,
          paddingTop: "8mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div style={{ fontSize: "9pt", fontWeight: 700, color: col.text, marginBottom: "4px" }}>
            Thank you for shopping with us!
          </div>
          <div style={{ fontSize: "8pt", color: col.muted }}>
            For queries: support@bill-dale.com
          </div>
          <div style={{ fontSize: "7.5pt", color: col.label, marginTop: "4px", fontFamily: "monospace" }}>
            Generated by Bill-Dale POS · {dateStr} {timeStr}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {/* Barcode-style decoration */}
          <div style={{ fontFamily: "monospace", fontSize: "7pt", color: col.label, letterSpacing: "3px" }}>
            ||||||||| {invoiceNo} |||||||||
          </div>
          <div style={{ fontSize: "7pt", color: col.label, marginTop: "3px" }}>Invoice No. {invoiceNo}</div>
        </div>
      </div>
    </div>
  );
}
