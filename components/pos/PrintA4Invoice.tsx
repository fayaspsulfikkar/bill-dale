import { Invoice } from "@/lib/types";
import { format } from "date-fns";
import type { ReceiptSettingsSnapshot } from "../settings/receipts/receipt-types";

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
  settings,
}: {
  invoice: Invoice;
  items: PrintItem[];
  amountTendered?: number;
  changeDue?: number;
  businessName?: string;
  settings?: ReceiptSettingsSnapshot;
}) {
  const subtotal = items.reduce((s, it) => s + it.product.price * it.quantity, 0);
  const totalTax = items.reduce((s, it) => s + (it.product.price * it.quantity * it.product.gst_percent) / 100, 0);
  
  // Calculate CGST / SGST split
  const totalCGST = totalTax / 2;
  const totalSGST = totalTax / 2;

  const invoiceNo = invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase();
  const dateStr = format(new Date(invoice.created_at), "dd MMM yyyy");
  const timeStr = format(new Date(invoice.created_at), "hh:mm a");

  // Colors
  const accentColor = settings?.receipt_brand_color || "#1a1a2e";
  const col = {
    accent: accentColor,
    accentLight: accentColor + "15", // 15% opacity hex
    border: "#e2e8f0",
    muted: "#64748b",
    green: "#16a34a",
    text: "#0f172a",
    label: "#94a3b8",
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: `1px ${settings?.receipt_show_borders ? "solid" : "none"} ${col.border}`,
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

  const displayStoreName = (settings?.receipt_show_store_name ?? true) ? (settings?.receipt_store_name || businessName) : "";

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
        fontSize: `${settings?.receipt_font_size || 10}pt`,
        lineHeight: settings?.receipt_line_spacing || 1.5,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* ── Watermark ── */}
      {settings?.receipt_watermark_url && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 0,
        }}>
          <img src={settings.receipt_watermark_url} alt="" style={{ maxWidth: "120mm", maxHeight: "120mm" }} />
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
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
            {settings?.receipt_logo_url && (
              <img 
                src={settings.receipt_logo_url} 
                alt="Logo" 
                style={{ 
                  height: settings.receipt_logo_size || 60, 
                  marginBottom: "8px",
                  objectFit: "contain"
                }} 
              />
            )}
            
            {displayStoreName && (
              <div
                style={{
                  fontSize: "26pt",
                  fontWeight: 900,
                  letterSpacing: "-1px",
                  color: col.accent,
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                {displayStoreName}
              </div>
            )}
            
            {settings?.receipt_show_legal_name && settings?.receipt_legal_name && (
              <div style={{ fontSize: "10pt", color: col.muted }}>{settings.receipt_legal_name}</div>
            )}

            {(settings?.receipt_show_address ?? true) && settings?.receipt_address && (
              <div style={{ fontSize: "9pt", color: col.text, marginTop: "4px" }}>{settings.receipt_address}</div>
            )}

            <div style={{ fontSize: "9pt", color: col.muted, marginTop: "4px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {(settings?.receipt_show_phone ?? true) && settings?.receipt_phone && (
                <span>Tel: {settings.receipt_phone}</span>
              )}
              {settings?.receipt_show_email && settings?.receipt_email && (
                <span>Email: {settings.receipt_email}</span>
              )}
            </div>
            
            <div style={{ fontSize: "9pt", color: col.muted, marginTop: "2px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {(settings?.receipt_show_gstin ?? true) && settings?.receipt_gstin && (
                <span style={{ fontWeight: 600 }}>GSTIN: {settings.receipt_gstin}</span>
              )}
              {settings?.receipt_show_fssai && settings?.receipt_fssai && (
                <span>FSSAI: {settings.receipt_fssai}</span>
              )}
            </div>

            {settings?.receipt_header && (
              <div style={{ fontSize: "9pt", color: col.text, marginTop: "8px", whiteSpace: "pre-wrap" }}>
                {settings.receipt_header}
              </div>
            )}
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
            <div style={{ fontWeight: 700, fontSize: "11pt", color: col.text }}>
              {(settings?.receipt_show_customer_name ?? true) && invoice.customer_id 
                ? (invoice as any).customer_name || "Customer" 
                : "Walk-in Customer"}
            </div>
            {settings?.receipt_show_customer_phone && (invoice as any).customer_phone && (
              <div style={{ fontSize: "9pt", color: col.muted, marginTop: "2px" }}>
                Ph: {(invoice as any).customer_phone}
              </div>
            )}
            <div style={{ fontSize: "8.5pt", color: col.muted, marginTop: "4px" }}>
              Cash / Counter Sale
            </div>
          </div>

          {/* Payment details */}
          <div style={{ flex: 1, background: "#f8fafc", border: `1px solid ${col.border}`, borderRadius: "6px", padding: "12px 16px" }}>
            <div style={labelStyle}>Payment Details</div>
            {(settings?.receipt_show_payment_method ?? true) && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "8.5pt", color: col.muted }}>Method</span>
                <span style={{ fontWeight: 700, fontSize: "8.5pt", textTransform: "uppercase", color: col.accent }}>
                  {invoice.payment_method}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "8.5pt", color: col.muted }}>Status</span>
              <span style={{ fontWeight: 700, fontSize: "8.5pt", textTransform: "uppercase", color: col.green }}>
                {invoice.status}
              </span>
            </div>
            {invoice.staff_name && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "8.5pt", color: col.muted }}>Cashier</span>
                <span style={{ fontWeight: 600, fontSize: "8.5pt", color: col.text }}>
                  {invoice.staff_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Items Table ─────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm", fontSize: "9pt" }}>
          <thead>
            <tr style={{ background: col.accent }}>
              {["Item / Description", "Qty", "Unit Price", (settings?.receipt_show_gst ?? true) ? "GST" : null, "Total"].filter(Boolean).map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 12px",
                    fontWeight: 700,
                    fontSize: "7.5pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    color: "#ffffff",
                    textAlign: h === "Item / Description" ? "left" : "right",
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
                    {(item.product.brand || item.product.size) && (
                      <div style={{ fontSize: "8pt", color: col.muted }}>
                        {[item.product.brand, item.product.size].filter(Boolean).join(" • ")}
                      </div>
                    )}
                    <div style={{ fontSize: "7.5pt", color: col.label, fontFamily: "monospace" }}>
                      SKU: {item.product.sku}
                    </div>
                  </td>
                  <td style={{ ...tdBase, textAlign: "right", fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ ...tdBase, textAlign: "right" }}>₹{item.product.price.toFixed(2)}</td>
                  
                  {(settings?.receipt_show_gst ?? true) && (
                    <td style={{ ...tdBase, textAlign: "right", color: col.muted }}>
                      <div>{item.product.gst_percent}%</div>
                      <div style={{ fontSize: "8pt" }}>₹{lineTax.toFixed(2)}</div>
                    </td>
                  )}
                  
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
              width: "280px",
              border: `1px solid ${col.border}`,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {settings?.receipt_show_taxable_value && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
                <span style={{ fontSize: "9pt", color: col.muted }}>Taxable Value</span>
                <span style={{ fontSize: "9pt", fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
              <span style={{ fontSize: "9pt", color: col.muted }}>Subtotal</span>
              <span style={{ fontSize: "9pt", fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
            </div>
            
            {(settings?.receipt_show_gst ?? true) && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: `1px solid ${col.border}` }}>
                <span style={{ fontSize: "9pt", color: col.muted }}>GST (Tax)</span>
                <span style={{ fontSize: "9pt", fontWeight: 600 }}>₹{totalTax.toFixed(2)}</span>
              </div>
            )}

            {settings?.receipt_show_cgst_sgst && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px 0 16px" }}>
                  <span style={{ fontSize: "8pt", color: col.muted }}>  CGST</span>
                  <span style={{ fontSize: "8pt", fontWeight: 500 }}>₹{totalCGST.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px 8px 16px", borderBottom: `1px solid ${col.border}` }}>
                  <span style={{ fontSize: "8pt", color: col.muted }}>  SGST</span>
                  <span style={{ fontSize: "8pt", fontWeight: 500 }}>₹{totalSGST.toFixed(2)}</span>
                </div>
              </>
            )}
            
            {(settings?.receipt_show_discount_breakdown ?? true) && invoice.discount > 0 && (
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
            {(settings?.receipt_show_change_returned ?? true) && invoice.payment_method === "cash" && amountTendered !== undefined && (
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
          <div style={{ maxWidth: "60%" }}>
            {settings?.receipt_thank_you_msg && (
              <div style={{ fontSize: "10pt", fontWeight: 700, color: col.text, marginBottom: "4px" }}>
                {settings.receipt_thank_you_msg}
              </div>
            )}
            {settings?.receipt_promo_msg && (
              <div style={{ fontSize: "9pt", fontStyle: "italic", color: col.accent, marginBottom: "4px" }}>
                {settings.receipt_promo_msg}
              </div>
            )}
            {settings?.receipt_return_policy && (
              <div style={{ fontSize: "8pt", color: col.muted, marginTop: "6px" }}>
                <strong>Returns:</strong> {settings.receipt_return_policy}
              </div>
            )}
            {settings?.receipt_exchange_policy && (
              <div style={{ fontSize: "8pt", color: col.muted, marginTop: "2px" }}>
                <strong>Exchange:</strong> {settings.receipt_exchange_policy}
              </div>
            )}
            {settings?.receipt_footer && (
              <div style={{ fontSize: "8pt", color: col.muted, marginTop: "8px", whiteSpace: "pre-wrap" }}>
                {settings.receipt_footer}
              </div>
            )}
            
            <div style={{ fontSize: "7.5pt", color: col.label, marginTop: "12px", fontFamily: "monospace" }}>
              Generated by Bill-Dale POS · {dateStr} {timeStr}
            </div>
          </div>
          
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            {settings?.receipt_show_qr && settings?.receipt_qr_data && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ width: 80, height: 80, border: `1px solid ${col.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: col.label, background: "#fafafa" }}>
                  [QR]
                </div>
              </div>
            )}

            {settings?.receipt_show_social_qr && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                {settings.receipt_social_instagram && <div style={{ fontSize: "8pt", color: col.muted }}>IG: {settings.receipt_social_instagram}</div>}
                {settings.receipt_social_facebook && <div style={{ fontSize: "8pt", color: col.muted }}>FB: {settings.receipt_social_facebook}</div>}
              </div>
            )}

            {/* Barcode-style decoration */}
            <div style={{ fontFamily: "monospace", fontSize: "7pt", color: col.label, letterSpacing: "3px" }}>
              ||||||||| {invoiceNo} |||||||||
            </div>
            <div style={{ fontSize: "7pt", color: col.label, marginTop: "3px" }}>Invoice No. {invoiceNo}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
