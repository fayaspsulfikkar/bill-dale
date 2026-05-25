import { Invoice, BusinessSettings } from "@/lib/types";
import { format } from "date-fns";
import type { DividerStyle } from "@/components/settings/receipts/receipt-types";

function getDividerStyle(style: DividerStyle = "dashed"): React.CSSProperties {
  if (style === "none") return { margin: "6px 0" };
  return {
    borderTopWidth: style === "double" ? "3px" : "1px",
    borderTopStyle: style === "double" ? "double" : style as any,
    borderTopColor: "#000",
    margin: "6px 0",
  };
}

function maskPhone(phone: string): string {
  if (phone.length < 10) return phone;
  const cleaned = phone.replace(/\s/g, "");
  const last3 = cleaned.slice(-3);
  const first5 = cleaned.slice(0, Math.max(3, cleaned.length - 7));
  return `${first5} ${"*".repeat(Math.max(2, cleaned.length - 8))} ${last3}`;
}

export function PrintThermalReceipt({
  invoice,
  items,
  amountTendered,
  changeDue,
  businessName = "BILL-DALE STORE",
  settings,
  customer,
  isDuplicate = false,
}: {
  invoice: Invoice;
  items: any[];
  amountTendered?: number;
  changeDue?: number;
  businessName?: string;
  settings?: BusinessSettings;
  customer?: { name?: string; phone?: string; loyalty_id?: string; loyalty_points?: number; membership_tier?: string; notes?: string };
  isDuplicate?: boolean;
}) {
  const subtotal = invoice.total_amount - invoice.tax_amount + invoice.discount;
  const width = settings?.receipt_paper_size || "80mm";
  const showGst = settings?.receipt_show_gst ?? true;
  const fontSize = settings?.receipt_font_size ? `${settings.receipt_font_size}pt` : "9pt";
  const lineHeight = settings?.receipt_line_spacing || 1.4;
  const isCompact = settings?.receipt_layout_mode === "compact";
  const divider = getDividerStyle(settings?.receipt_divider_style as DividerStyle);
  const headerAlign = settings?.receipt_text_alignment || "left";
  const logoPosition = settings?.receipt_logo_position || "center";
  const logoSize = settings?.receipt_logo_size || 80;

  // Tax breakdown helpers
  const computeItemTax = (item: any) => {
    const base = item.product.price * item.quantity;
    const tax = (base * item.product.gst_percent) / 100;
    return { base, tax, cgst: tax / 2, sgst: tax / 2 };
  };

  const totalCGST = items.reduce((s, it) => s + computeItemTax(it).cgst, 0);
  const totalSGST = items.reduce((s, it) => s + computeItemTax(it).sgst, 0);

  const hideCustomer = isDuplicate && settings?.receipt_hide_customer_on_duplicate;

  return (
    <div
      style={{
        width: width,
        margin: "0 auto",
        padding: `${settings?.receipt_margin_top ?? 6}mm 4mm ${settings?.receipt_margin_bottom ?? 6}mm`,
        background: "white",
        color: "#000",
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        fontSize,
        lineHeight,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Watermark */}
      {settings?.receipt_watermark_url && !settings?.receipt_ink_saving && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.05,
          pointerEvents: "none",
        }}>
          <img src={settings.receipt_watermark_url} alt="" style={{ maxWidth: "80%", maxHeight: 200 }} />
        </div>
      )}

      {/* Duplicate Label */}
      {isDuplicate && (
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10pt", letterSpacing: "2px", marginBottom: 4 }}>
          — DUPLICATE —
        </div>
      )}

      {/* Store Header */}
      <div style={{ textAlign: headerAlign === "center" ? "center" : "left", marginBottom: isCompact ? 4 : 6 }}>
        {/* Logo */}
        {settings?.receipt_logo_url && !settings?.receipt_ink_saving && (
          <div style={{
            textAlign: logoPosition === "left" ? "left" : logoPosition === "right" ? "right" : "center",
            marginBottom: 8,
          }}>
            <img
              src={settings.receipt_logo_url}
              alt="Logo"
              style={{ maxWidth: "80%", maxHeight: `${logoSize}px`, objectFit: "contain", display: "inline-block" }}
            />
          </div>
        )}

        {/* Store Name */}
        {(settings?.receipt_show_store_name ?? true) && (
          <div style={{
            fontSize: isCompact ? "12pt" : "14pt",
            fontWeight: 900,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}>
            {settings?.receipt_store_name || businessName}
          </div>
        )}

        {/* Legal Name */}
        {settings?.receipt_show_legal_name && settings?.receipt_legal_name && (
          <div style={{ fontSize: "7pt", color: "#666", marginTop: 1 }}>{settings.receipt_legal_name}</div>
        )}

        {/* Address */}
        {(settings?.receipt_show_address ?? true) && (settings?.receipt_address || !settings?.receipt_store_name) && (
          <div style={{ fontSize: "8pt", marginTop: 2 }}>
            {settings?.receipt_address || (settings?.receipt_header ? "" : "123 Business Ave, Tech District")}
          </div>
        )}

        {/* Phone */}
        {(settings?.receipt_show_phone ?? true) && (settings?.receipt_phone || !settings?.receipt_store_name) && (
          <div style={{ fontSize: "8pt" }}>
            Tel: {settings?.receipt_phone || "+1 234 567 8900"}
          </div>
        )}

        {/* Email */}
        {settings?.receipt_show_email && settings?.receipt_email && (
          <div style={{ fontSize: "7pt", color: "#666" }}>{settings.receipt_email}</div>
        )}

        {/* Website */}
        {settings?.receipt_show_website && settings?.receipt_website && (
          <div style={{ fontSize: "7pt", color: "#666" }}>{settings.receipt_website}</div>
        )}

        {/* GSTIN */}
        {(settings?.receipt_show_gstin ?? true) && (
          <div style={{ fontSize: "8pt", marginTop: 2 }}>
            GSTIN: {settings?.receipt_gstin || "29XXXXX0000X1Z5"}
          </div>
        )}

        {/* FSSAI */}
        {settings?.receipt_show_fssai && settings?.receipt_fssai && (
          <div style={{ fontSize: "7pt", color: "#666" }}>FSSAI: {settings.receipt_fssai}</div>
        )}

        {/* Branch Name */}
        {settings?.receipt_show_branch_name && settings?.receipt_branch_name && (
          <div style={{ fontSize: "8pt", fontWeight: 700 }}>Branch: {settings.receipt_branch_name}</div>
        )}

        {/* Support Contact */}
        {settings?.receipt_show_support_contact && settings?.receipt_support_contact && (
          <div style={{ fontSize: "7pt", color: "#666" }}>Support: {settings.receipt_support_contact}</div>
        )}

        {/* Header message */}
        {settings?.receipt_header && (
          <div style={{ fontSize: "8pt", marginTop: 4, whiteSpace: "pre-wrap" }}>
            {settings.receipt_header}
          </div>
        )}

        {/* Seasonal message */}
        {settings?.receipt_seasonal_msg && (
          <div style={{ fontSize: "7.5pt", marginTop: 3, fontStyle: "italic", color: "#555" }}>
            {settings.receipt_seasonal_msg}
          </div>
        )}

        <div style={{ marginTop: isCompact ? 4 : 6, fontWeight: "bold", letterSpacing: "1.5px", fontSize: "9pt" }}>
          ** TAX INVOICE **
        </div>
      </div>

      <div style={divider} />

      {/* Invoice Meta */}
      <div style={{ fontSize: "8.5pt", marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Invoice #:</span>
          <span style={{ fontWeight: "bold" }}>{invoice.invoice_number || invoice.id.split("-")[0].toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date:</span>
          <span>{format(new Date(invoice.created_at), "dd/MM/yyyy")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Time:</span>
          <span>{format(new Date(invoice.created_at), "HH:mm:ss")}</span>
        </div>
        {invoice.staff_name && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cashier:</span>
            <span>{invoice.staff_name}</span>
          </div>
        )}
      </div>

      {/* Customer Info */}
      {customer && !hideCustomer && (
        (settings?.receipt_show_customer_name || settings?.receipt_show_customer_phone ||
         settings?.receipt_show_loyalty_id || settings?.receipt_show_loyalty_points ||
         settings?.receipt_show_membership_tier) && (
          <>
            <div style={divider} />
            <div style={{ fontSize: "8.5pt", marginBottom: 4 }}>
              {(settings?.receipt_show_customer_name ?? true) && customer.name && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Customer:</span><span style={{ fontWeight: "bold" }}>{customer.name}</span>
                </div>
              )}
              {settings?.receipt_show_customer_phone && customer.phone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Phone:</span>
                  <span>{settings?.receipt_mask_customer_phone ? maskPhone(customer.phone) : customer.phone}</span>
                </div>
              )}
              {settings?.receipt_show_loyalty_id && customer.loyalty_id && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Loyalty:</span><span>{customer.loyalty_id}</span>
                </div>
              )}
              {settings?.receipt_show_loyalty_points && customer.loyalty_points !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Points:</span><span>{customer.loyalty_points}</span>
                </div>
              )}
              {settings?.receipt_show_membership_tier && customer.membership_tier && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tier:</span><span>{customer.membership_tier}</span>
                </div>
              )}
            </div>
          </>
        )
      )}

      <div style={divider} />

      {/* Items */}
      <div style={{ fontSize: "8.5pt" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            marginBottom: "4px",
            borderBottom: "1px solid #000",
            paddingBottom: "3px",
          }}
        >
          <span style={{ flex: 1 }}>Item</span>
          <span style={{ width: "45px", textAlign: "right" }}>Qty</span>
          <span style={{ width: "60px", textAlign: "right" }}>Total</span>
        </div>

        {items.map((item, idx) => {
          const lineTotal = item.product.price * item.quantity;
          return (
            <div key={idx} style={{
              marginBottom: isCompact ? "3px" : "6px",
              borderBottom: settings?.receipt_show_borders ? "1px dotted #ccc" : "none",
              paddingBottom: settings?.receipt_show_borders ? "3px" : "0",
            }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "110px",
                    fontWeight: "bold",
                  }}
                >
                  {item.product.name}
                </span>
                <span style={{ width: "45px", textAlign: "right" }}>{item.quantity}</span>
                <span style={{ width: "60px", textAlign: "right" }}>₹{lineTotal.toFixed(2)}</span>
              </div>
              {!isCompact && (
                <div style={{ color: "#444", fontSize: "7.5pt" }}>
                  {item.product.sku} @ ₹{item.product.price.toFixed(2)} + {item.product.gst_percent}% GST
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={divider} />

      {/* Totals */}
      <div style={{ fontSize: "8.5pt" }}>
        {settings?.receipt_show_taxable_value && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>Taxable Value:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        {showGst && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>GST (Tax):</span>
            <span>₹{invoice.tax_amount.toFixed(2)}</span>
          </div>
        )}
        {settings?.receipt_show_cgst_sgst && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1px", fontSize: "7.5pt", color: "#555" }}>
              <span>  CGST:</span><span>₹{totalCGST.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "7.5pt", color: "#555" }}>
              <span>  SGST:</span><span>₹{totalSGST.toFixed(2)}</span>
            </div>
          </>
        )}
        {(settings?.receipt_show_discount_breakdown ?? true) && invoice.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>Discount:</span>
            <span>-₹{invoice.discount.toFixed(2)}</span>
          </div>
        )}
        {settings?.receipt_show_round_off && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "7.5pt", color: "#555" }}>
            <span>Round-off:</span>
            <span>₹0.00</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "2px solid #000", margin: "6px 0" }} />

      {/* Grand Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: isCompact ? "11pt" : "13pt",
          marginBottom: "6px",
        }}
      >
        <span>TOTAL:</span>
        <span>₹{invoice.total_amount.toFixed(2)}</span>
      </div>

      {/* Saved Amount */}
      {settings?.receipt_show_saved_amount && invoice.discount > 0 && (
        <div style={{
          textAlign: "center",
          fontSize: "8pt",
          fontWeight: "bold",
          padding: "3px 0",
          borderTop: "1px dashed #000",
          borderBottom: "1px dashed #000",
          marginBottom: 6,
        }}>
          You Saved ₹{invoice.discount.toFixed(2)}!
        </div>
      )}

      <div style={divider} />

      {/* Payment Info */}
      {(settings?.receipt_show_payment_method ?? true) && (
        <div style={{ fontSize: "8.5pt", marginBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Payment:</span>
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{invoice.payment_method}</span>
          </div>
          {(settings?.receipt_show_change_returned ?? true) && invoice.payment_method === "cash" && amountTendered !== undefined && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tendered:</span>
                <span>₹{amountTendered.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Change:</span>
                <span>₹{(changeDue ?? 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div style={divider} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "8pt", color: "#333" }}>
        {settings?.receipt_thank_you_msg ? (
          <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "9pt" }}>
            {settings.receipt_thank_you_msg}
          </div>
        ) : !settings?.receipt_footer && (
          <>
            <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "9pt" }}>
              THANK YOU FOR YOUR PURCHASE!
            </div>
            <div>Please retain this receipt</div>
            <div>No returns without receipt.</div>
          </>
        )}

        {settings?.receipt_promo_msg && (
          <div style={{ marginBottom: 4, fontStyle: "italic", color: "#555" }}>
            {settings.receipt_promo_msg}
          </div>
        )}

        {settings?.receipt_return_policy && (
          <div style={{ marginBottom: 2, fontSize: "7pt", color: "#666" }}>
            Return: {settings.receipt_return_policy}
          </div>
        )}

        {settings?.receipt_exchange_policy && (
          <div style={{ marginBottom: 4, fontSize: "7pt", color: "#666" }}>
            Exchange: {settings.receipt_exchange_policy}
          </div>
        )}

        {settings?.receipt_footer && (
          <div style={{ whiteSpace: "pre-wrap", marginBottom: "4px" }}>
            {settings.receipt_footer}
          </div>
        )}

        {/* QR Code placeholder */}
        {settings?.receipt_show_qr && settings?.receipt_qr_data && (
          <div style={{ marginTop: 6, marginBottom: 6 }}>
            <div style={{
              width: 60,
              height: 60,
              margin: "0 auto",
              border: "1px solid #999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "6pt",
              color: "#999",
            }}>
              [QR CODE]
            </div>
            <div style={{ fontSize: "6pt", color: "#999", marginTop: 2 }}>Scan for details</div>
          </div>
        )}

        <div style={{ marginTop: "8px", fontSize: "7pt", color: "#777" }}>
          Powered by Bill-Dale POS
        </div>
      </div>
    </div>
  );
}
