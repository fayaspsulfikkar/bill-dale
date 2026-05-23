"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { ReceiptSettingsSnapshot, DividerStyle } from "./receipt-types";
import { MOCK_ITEMS, MOCK_INVOICE, MOCK_CUSTOMER, MOCK_PAYMENT } from "./receipt-constants";

interface Props {
  form: ReceiptSettingsSnapshot;
}

function getDividerCSS(style: DividerStyle = "dashed"): React.CSSProperties {
  if (style === "none") return {};
  return {
    borderTopWidth: style === "double" ? "3px" : "1px",
    borderTopStyle: style === "double" ? "double" : style as any,
    borderTopColor: "#555",
    margin: "6px 0",
  };
}

function maskPhone(phone: string): string {
  // +91 98765 43210 → +91 98*** **210
  if (phone.length < 10) return phone;
  const cleaned = phone.replace(/\s/g, "");
  const last3 = cleaned.slice(-3);
  const first5 = cleaned.slice(0, Math.max(3, cleaned.length - 7));
  return `${first5} ${"*".repeat(Math.max(2, cleaned.length - 8))} ${last3}`;
}

export default function ReceiptPreview({ form }: Props) {
  const paperWidth = form.receipt_paper_size === "58mm" ? 216 : 302; // px approximations
  const fontSize = `${form.receipt_font_size || 9}pt`;
  const lineHeight = form.receipt_line_spacing || 1.4;
  const isCompact = form.receipt_layout_mode === "compact";
  const dividerStyle = getDividerCSS(form.receipt_divider_style);
  const headerAlign = form.receipt_text_alignment || "left";
  const brandColor = form.receipt_brand_color || "#000000";

  // Compute totals
  const computed = useMemo(() => {
    const items = MOCK_ITEMS.map(item => {
      const base = item.price * item.qty;
      const tax = (base * item.gst_percent) / 100;
      const cgst = tax / 2;
      const sgst = tax / 2;
      return { ...item, base, tax, cgst, sgst, total: base + tax };
    });
    const subtotal = items.reduce((s, i) => s + i.base, 0);
    const totalTax = items.reduce((s, i) => s + i.tax, 0);
    const totalCGST = items.reduce((s, i) => s + i.cgst, 0);
    const totalSGST = items.reduce((s, i) => s + i.sgst, 0);
    return { items, subtotal, totalTax, totalCGST, totalSGST };
  }, []);

  const dateStr = format(new Date(MOCK_INVOICE.created_at), "dd/MM/yyyy");
  const timeStr = format(new Date(MOCK_INVOICE.created_at), "HH:mm:ss");

  return (
    <div className="flex flex-col items-center">
      {/* Paper size indicator */}
      <div className="text-[10px] text-muted-foreground mb-2 font-mono">
        {form.receipt_paper_size || "80mm"} Preview ({paperWidth}px)
      </div>

      {/* Receipt paper */}
      <div
        style={{
          width: paperWidth,
          fontFamily: "'Courier New', 'Lucida Console', monospace",
          fontSize,
          lineHeight,
          color: "#000",
          background: "#fff",
          padding: `${form.receipt_margin_top || 6}px ${isCompact ? 8 : 12}px ${form.receipt_margin_bottom || 6}px`,
          boxSizing: "border-box",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
          borderRadius: "2px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark */}
        {form.receipt_watermark_url && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.06,
            pointerEvents: "none",
          }}>
            <img src={form.receipt_watermark_url} alt="" style={{ maxWidth: "80%", maxHeight: 200 }} />
          </div>
        )}

        {/* ── Logo ── */}
        {form.receipt_logo_url && (
          <div style={{
            textAlign: form.receipt_logo_position === "left" ? "left" : form.receipt_logo_position === "right" ? "right" : "center",
            marginBottom: isCompact ? 4 : 8,
          }}>
            <img
              src={form.receipt_logo_url}
              alt="Logo"
              style={{
                height: form.receipt_logo_size || 60,
                maxWidth: "80%",
                objectFit: "contain",
                display: "inline-block",
              }}
            />
          </div>
        )}

        {/* ── Store Header ── */}
        <div style={{ textAlign: headerAlign === "center" ? "center" : "left", marginBottom: isCompact ? 4 : 6 }}>
          {(form.receipt_show_store_name ?? true) && (form.receipt_store_name || "YOUR STORE NAME") && (
            <div style={{
              fontSize: isCompact ? "12pt" : "14pt",
              fontWeight: 900,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: brandColor,
            }}>
              {form.receipt_store_name || "YOUR STORE NAME"}
            </div>
          )}
          {form.receipt_show_legal_name && form.receipt_legal_name && (
            <div style={{ fontSize: "7pt", color: "#666", marginTop: 1 }}>{form.receipt_legal_name}</div>
          )}
          {(form.receipt_show_address ?? true) && (form.receipt_address || "123 Business Ave, City") && (
            <div style={{ fontSize: "7.5pt", marginTop: 2, color: "#444" }}>{form.receipt_address || "123 Business Ave, City"}</div>
          )}
          {(form.receipt_show_phone ?? true) && (form.receipt_phone || "+91 98765 43210") && (
            <div style={{ fontSize: "7.5pt", color: "#444" }}>Tel: {form.receipt_phone || "+91 98765 43210"}</div>
          )}
          {form.receipt_show_email && form.receipt_email && (
            <div style={{ fontSize: "7pt", color: "#666" }}>{form.receipt_email}</div>
          )}
          {form.receipt_show_website && form.receipt_website && (
            <div style={{ fontSize: "7pt", color: "#666" }}>{form.receipt_website}</div>
          )}
          {(form.receipt_show_gstin ?? true) && (
            <div style={{ fontSize: "7.5pt", marginTop: 2, color: "#444" }}>GSTIN: {form.receipt_gstin || "29AAAAA0000A1Z5"}</div>
          )}
          {form.receipt_show_fssai && form.receipt_fssai && (
            <div style={{ fontSize: "7pt", color: "#666" }}>FSSAI: {form.receipt_fssai}</div>
          )}
          {form.receipt_show_branch_name && form.receipt_branch_name && (
            <div style={{ fontSize: "7.5pt", color: "#444", fontWeight: 700 }}>Branch: {form.receipt_branch_name}</div>
          )}
          {form.receipt_show_support_contact && form.receipt_support_contact && (
            <div style={{ fontSize: "7pt", color: "#666" }}>Support: {form.receipt_support_contact}</div>
          )}

          {/* Header message */}
          {form.receipt_header && (
            <div style={{ fontSize: "7.5pt", marginTop: 4, whiteSpace: "pre-wrap", color: "#333" }}>{form.receipt_header}</div>
          )}

          {/* Seasonal message */}
          {form.receipt_seasonal_msg && (
            <div style={{ fontSize: "7.5pt", marginTop: 3, fontStyle: "italic", color: "#555" }}>{form.receipt_seasonal_msg}</div>
          )}

          <div style={{ marginTop: isCompact ? 4 : 6, fontWeight: "bold", letterSpacing: "1.5px", fontSize: "8.5pt" }}>
            ** TAX INVOICE **
          </div>
        </div>

        <div style={dividerStyle} />

        {/* ── Invoice Meta ── */}
        <div style={{ fontSize: "8pt", marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Invoice #:</span>
            <span style={{ fontWeight: "bold" }}>{MOCK_INVOICE.invoice_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Date:</span><span>{dateStr}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Time:</span><span>{timeStr}</span>
          </div>
          {MOCK_INVOICE.staff_name && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Cashier:</span><span>{MOCK_INVOICE.staff_name}</span>
            </div>
          )}
        </div>

        {/* ── Customer Info ── */}
        {(form.receipt_show_customer_name || form.receipt_show_customer_phone || form.receipt_show_loyalty_id || form.receipt_show_loyalty_points || form.receipt_show_membership_tier) && (
          <>
            <div style={dividerStyle} />
            <div style={{ fontSize: "8pt", marginBottom: 4 }}>
              {(form.receipt_show_customer_name ?? true) && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Customer:</span><span style={{ fontWeight: "bold" }}>{MOCK_CUSTOMER.name}</span>
                </div>
              )}
              {form.receipt_show_customer_phone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Phone:</span>
                  <span>{form.receipt_mask_customer_phone ? maskPhone(MOCK_CUSTOMER.phone) : MOCK_CUSTOMER.phone}</span>
                </div>
              )}
              {form.receipt_show_loyalty_id && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Loyalty ID:</span><span>{MOCK_CUSTOMER.loyalty_id}</span>
                </div>
              )}
              {form.receipt_show_loyalty_points && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Points:</span><span>{MOCK_CUSTOMER.loyalty_points}</span>
                </div>
              )}
              {form.receipt_show_membership_tier && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tier:</span><span style={{ fontWeight: "bold" }}>⭐ {MOCK_CUSTOMER.membership_tier}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div style={dividerStyle} />

        {/* ── Items ── */}
        <div style={{ fontSize: "8pt" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            marginBottom: 4,
            borderBottom: "1px solid #000",
            paddingBottom: 3,
          }}>
            <span style={{ flex: 1 }}>Item</span>
            <span style={{ width: 35, textAlign: "right" }}>Qty</span>
            <span style={{ width: 55, textAlign: "right" }}>Total</span>
          </div>

          {computed.items.map((item, idx) => (
            <div key={idx} style={{
              marginBottom: isCompact ? 3 : 6,
              borderBottom: form.receipt_show_borders ? "1px dotted #ccc" : "none",
              paddingBottom: form.receipt_show_borders ? 3 : 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: paperWidth - 110,
                  fontWeight: "bold",
                }}>
                  {item.name}
                </span>
                <span style={{ width: 35, textAlign: "right" }}>{item.qty}</span>
                <span style={{ width: 55, textAlign: "right" }}>₹{item.base.toFixed(2)}</span>
              </div>
              {!isCompact && (
                <div style={{ color: "#666", fontSize: "7pt" }}>
                  {item.sku} @ ₹{item.price.toFixed(2)} + {item.gst_percent}% GST
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={dividerStyle} />

        {/* ── Totals ── */}
        <div style={{ fontSize: "8pt" }}>
          {(form.receipt_show_taxable_value) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Taxable Value:</span><span>₹{computed.subtotal.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span>Subtotal:</span><span>₹{computed.subtotal.toFixed(2)}</span>
          </div>
          {(form.receipt_show_gst ?? true) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>GST (Tax):</span><span>₹{computed.totalTax.toFixed(2)}</span>
            </div>
          )}
          {form.receipt_show_cgst_sgst && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1, fontSize: "7.5pt", color: "#555" }}>
                <span>  CGST:</span><span>₹{computed.totalCGST.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: "7.5pt", color: "#555" }}>
                <span>  SGST:</span><span>₹{computed.totalSGST.toFixed(2)}</span>
              </div>
            </>
          )}
          {(form.receipt_show_discount_breakdown ?? true) && MOCK_INVOICE.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Discount:</span><span>-₹{MOCK_INVOICE.discount.toFixed(2)}</span>
            </div>
          )}
          {(form.receipt_show_coupon ?? true) && MOCK_PAYMENT.coupon_code && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: "7.5pt", color: "#555" }}>
              <span>  Coupon ({MOCK_PAYMENT.coupon_code}):</span><span>-₹{MOCK_PAYMENT.coupon_discount.toFixed(2)}</span>
            </div>
          )}
          {form.receipt_show_round_off && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: "7.5pt", color: "#555" }}>
              <span>Round-off:</span><span>₹{MOCK_PAYMENT.round_off.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div style={{ borderTop: "2px solid #000", margin: "6px 0" }} />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: isCompact ? "11pt" : "13pt",
          marginBottom: 6,
        }}>
          <span>TOTAL:</span>
          <span>₹{MOCK_INVOICE.total_amount.toFixed(2)}</span>
        </div>

        {form.receipt_show_saved_amount && MOCK_PAYMENT.saved_amount > 0 && (
          <div style={{
            textAlign: "center",
            fontSize: "8pt",
            fontWeight: "bold",
            color: "#16a34a",
            padding: "3px 0",
            borderTop: "1px dashed #16a34a",
            borderBottom: "1px dashed #16a34a",
            marginBottom: 6,
          }}>
            🎉 You Saved ₹{MOCK_PAYMENT.saved_amount.toFixed(2)}!
          </div>
        )}

        <div style={dividerStyle} />

        {/* ── Payment ── */}
        {(form.receipt_show_payment_method ?? true) && (
          <div style={{ fontSize: "8pt", marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Payment:</span>
              <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{MOCK_INVOICE.payment_method}</span>
            </div>
            {(form.receipt_show_change_returned ?? true) && MOCK_INVOICE.payment_method === "cash" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tendered:</span><span>₹{MOCK_PAYMENT.amount_tendered.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Change:</span><span>₹{MOCK_PAYMENT.change_due.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div style={dividerStyle} />

        {/* ── Footer Messages ── */}
        <div style={{ textAlign: "center", fontSize: "7.5pt", color: "#333" }}>
          {form.receipt_thank_you_msg && (
            <div style={{ fontWeight: "bold", marginBottom: 4, fontSize: "8.5pt" }}>
              {form.receipt_thank_you_msg}
            </div>
          )}

          {form.receipt_promo_msg && (
            <div style={{ marginBottom: 4, fontStyle: "italic", color: "#555" }}>
              {form.receipt_promo_msg}
            </div>
          )}

          {form.receipt_return_policy && (
            <div style={{ marginBottom: 2, fontSize: "7pt", color: "#666" }}>
              Return: {form.receipt_return_policy}
            </div>
          )}

          {form.receipt_exchange_policy && (
            <div style={{ marginBottom: 4, fontSize: "7pt", color: "#666" }}>
              Exchange: {form.receipt_exchange_policy}
            </div>
          )}

          {form.receipt_footer && (
            <div style={{ whiteSpace: "pre-wrap", marginBottom: 4, color: "#444" }}>
              {form.receipt_footer}
            </div>
          )}

          {/* Social QR codes */}
          {form.receipt_show_social_qr && (
            <div style={{ marginTop: 6, marginBottom: 6 }}>
              <div style={{ fontSize: "7pt", fontWeight: "bold", marginBottom: 3, color: "#555" }}>Follow us:</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                {form.receipt_social_instagram && <div style={{ textAlign: "center" }}><div style={{ width: 30, height: 30, border: "1px solid #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt" }}>IG</div></div>}
                {form.receipt_social_facebook && <div style={{ textAlign: "center" }}><div style={{ width: 30, height: 30, border: "1px solid #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt" }}>FB</div></div>}
                {form.receipt_social_twitter && <div style={{ textAlign: "center" }}><div style={{ width: 30, height: 30, border: "1px solid #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt" }}>X</div></div>}
                {form.receipt_social_youtube && <div style={{ textAlign: "center" }}><div style={{ width: 30, height: 30, border: "1px solid #ccc", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt" }}>YT</div></div>}
              </div>
            </div>
          )}

          {/* QR Code */}
          {form.receipt_show_qr && form.receipt_qr_data && (
            <div style={{ marginTop: 6, marginBottom: 6 }}>
              <div style={{
                width: 60,
                height: 60,
                margin: "0 auto",
                border: "1px solid #ccc",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "6pt",
                color: "#999",
                background: "#fafafa",
              }}>
                [QR CODE]
              </div>
              <div style={{ fontSize: "6pt", color: "#999", marginTop: 2 }}>Scan for details</div>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: "7pt", color: "#999" }}>
            Powered by Bill-Dale POS
          </div>
        </div>
      </div>

      {/* Torn paper edge effect */}
      <div style={{
        width: paperWidth,
        height: 12,
        background: "linear-gradient(135deg, #fff 33.33%, transparent 33.33%) 0 0, linear-gradient(225deg, #fff 33.33%, transparent 33.33%) 0 0",
        backgroundSize: "8px 12px",
        backgroundRepeat: "repeat-x",
      }} />
    </div>
  );
}
