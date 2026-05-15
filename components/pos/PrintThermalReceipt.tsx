import { Invoice } from "@/offline/db";
import { format } from "date-fns";

export function PrintThermalReceipt({
  invoice,
  items,
  amountTendered,
  changeDue,
  businessName = "BILL-DALE STORE",
}: {
  invoice: Invoice;
  items: any[];
  amountTendered?: number;
  changeDue?: number;
  businessName?: string;
}) {
  const subtotal = invoice.total_amount - invoice.tax_amount + invoice.discount;

  const divider = (char = "-") =>
    char.repeat(32);

  return (
    <div
      style={{
        width: "80mm",
        margin: "0 auto",
        padding: "6mm 4mm",
        background: "white",
        color: "#000",
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        fontSize: "9pt",
        lineHeight: "1.4",
        boxSizing: "border-box",
      }}
    >
      {/* Store Header */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <div
          style={{
            fontSize: "14pt",
            fontWeight: "900",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          {businessName}
        </div>
        <div style={{ fontSize: "8pt", marginTop: "2px" }}>123 Business Ave, Tech District</div>
        <div style={{ fontSize: "8pt" }}>Tel: +1 234 567 8900</div>
        <div style={{ fontSize: "8pt" }}>GSTIN: 29XXXXX0000X1Z5</div>
        <div style={{ marginTop: "6px", fontWeight: "bold", letterSpacing: "1.5px", fontSize: "9pt" }}>
          ** TAX INVOICE **
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Invoice Meta */}
      <div style={{ fontSize: "8.5pt", marginBottom: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Invoice #:</span>
          <span style={{ fontWeight: "bold" }}>{invoice.id.split("-")[0].toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date:</span>
          <span>{format(new Date(invoice.created_at), "dd/MM/yyyy")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Time:</span>
          <span>{format(new Date(invoice.created_at), "HH:mm:ss")}</span>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

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
            <div key={idx} style={{ marginBottom: "6px" }}>
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
              <div style={{ color: "#444", fontSize: "7.5pt" }}>
                {item.product.sku} @ ₹{item.product.price.toFixed(2)} + {item.product.gst_percent}% GST
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Totals */}
      <div style={{ fontSize: "8.5pt" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span>GST (Tax):</span>
          <span>₹{invoice.tax_amount.toFixed(2)}</span>
        </div>
        {invoice.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span>Discount:</span>
            <span>-₹{invoice.discount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "2px solid #000", margin: "6px 0" }} />

      {/* Grand Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "900",
          fontSize: "13pt",
          marginBottom: "6px",
        }}
      >
        <span>TOTAL:</span>
        <span>₹{invoice.total_amount.toFixed(2)}</span>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Payment Info */}
      <div style={{ fontSize: "8.5pt", marginBottom: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Payment:</span>
          <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{invoice.payment_method}</span>
        </div>
        {invoice.payment_method === "cash" && amountTendered !== undefined && (
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

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "8pt", color: "#333" }}>
        <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "9pt" }}>
          THANK YOU FOR YOUR PURCHASE!
        </div>
        <div>Please retain this receipt</div>
        <div>No returns without receipt.</div>
        <div style={{ marginTop: "8px", fontSize: "7pt", color: "#777" }}>
          Powered by Bill-Dale POS
        </div>
      </div>
    </div>
  );
}
