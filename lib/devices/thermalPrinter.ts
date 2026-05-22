export const isSerialSupported = () => {
  return typeof window !== 'undefined' && 'serial' in navigator;
};

let activePort: any = null;
let activeWriter: any = null;

export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  initialize() {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1b, 0x61, 1); // ESC a 1 (Align center)
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1b, 0x61, 0); // ESC a 0 (Align left)
    return this;
  }

  alignRight() {
    this.buffer.push(0x1b, 0x61, 2); // ESC a 2 (Align right)
    return this;
  }

  bold(on: boolean) {
    this.buffer.push(0x1b, 0x45, on ? 1 : 0); // ESC E n (Turn bold on/off)
    return this;
  }

  sizeDouble() {
    this.buffer.push(0x1d, 0x21, 0x11); // GS ! 0x11 (Double height + Double width)
    return this;
  }

  sizeNormal() {
    this.buffer.push(0x1d, 0x21, 0x00); // GS ! 0x00 (Normal character size)
    return this;
  }

  lineFeed(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  text(str: string) {
    const encoder = new TextEncoder();
    // Strip emojis or non-ascii symbols for simple compatibility if needed,
    // but TextEncoder keeps unicode utf-8 standard which modern printers support
    const bytes = encoder.encode(str);
    bytes.forEach((b) => this.buffer.push(b));
    return this;
  }

  line(str: string) {
    this.text(str);
    this.lineFeed();
    return this;
  }

  divider(char = '-', width = 32) {
    this.line(char.repeat(width));
    return this;
  }

  cut() {
    this.buffer.push(0x1d, 0x56, 66, 0); // GS V 66 0 (Cut paper)
    return this;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export async function pairPrinter(): Promise<any> {
  if (!isSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser.');
  }
  const port = await (navigator as any).serial.requestPort();
  return port;
}

export async function getPairedPorts(): Promise<any[]> {
  if (!isSerialSupported()) return [];
  try {
    return await (navigator as any).serial.getPorts();
  } catch (e) {
    console.error('Error fetching paired ports:', e);
    return [];
  }
}

export async function connectPrinter(port: any, baudRate: number = 9600): Promise<void> {
  if (activePort) {
    await disconnectPrinter();
  }
  await port.open({ baudRate });
  activePort = port;
  activeWriter = port.writable.getWriter();
}

export async function writeRaw(data: Uint8Array): Promise<void> {
  if (!activeWriter) {
    throw new Error('Printer is not connected.');
  }
  await activeWriter.write(data);
}

export async function disconnectPrinter(): Promise<void> {
  if (activeWriter) {
    try {
      activeWriter.releaseLock();
    } catch (e) {
      console.error('Error releasing write lock:', e);
    }
    activeWriter = null;
  }
  if (activePort) {
    try {
      await activePort.close();
    } catch (e) {
      console.error('Error closing serial port:', e);
    }
    activePort = null;
  }
}

export function generateEscPosReceipt(
  invoice: any,
  items: any[],
  settings: any,
  options?: { amountTendered?: number; changeDue?: number; businessName?: string }
): Uint8Array {
  const paperSize = settings?.receipt_paper_size || '80mm';
  const cols = paperSize === '58mm' ? 32 : 42;
  
  const encoder = new EscPosEncoder();
  
  // Header
  encoder.alignCenter().sizeDouble().bold(true).line(options?.businessName || 'BILL-DALE STORE');
  encoder.sizeNormal().bold(false);
  
  if (settings?.receipt_header) {
    encoder.line(settings.receipt_header);
  } else {
    encoder.line("123 Business Ave, Tech District");
    encoder.line("Tel: +1 234 567 8900");
  }
  
  if (settings?.receipt_show_gst) {
    encoder.line("GSTIN: 29XXXXX0000X1Z5");
  }
  
  encoder.lineFeed().bold(true).line("** TAX INVOICE **").bold(false);
  encoder.divider('-', cols);
  
  // Meta
  const invoiceNo = invoice.id.split("-")[0].toUpperCase();
  encoder.alignLeft();
  encoder.line(`Invoice #: ${invoiceNo}`);
  
  const dateStr = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const timeStr = invoice.created_at ? new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  encoder.line(`Date: ${dateStr}   Time: ${timeStr}`);
  encoder.divider('-', cols);
  
  // Table Headers
  const qtyColWidth = 5;
  const priceColWidth = 8;
  const nameColWidth = cols - qtyColWidth - priceColWidth - 2;
  
  const headerName = "Item".padEnd(nameColWidth);
  const headerQty = "Qty".padStart(qtyColWidth);
  const headerTotal = "Total".padStart(priceColWidth);
  encoder.bold(true).line(`${headerName}  ${headerQty} ${headerTotal}`).bold(false);
  encoder.divider('-', cols);
  
  // Items
  items.forEach((item) => {
    const product = item.product || item;
    const name = product.name || 'Product';
    const qty = String(item.quantity);
    const priceNum = product.price || 0;
    const lineTotal = (priceNum * item.quantity).toFixed(2);
    
    let namePart = name;
    if (namePart.length > nameColWidth) {
      namePart = namePart.substring(0, nameColWidth);
    }
    
    const qtyPart = qty.padStart(qtyColWidth);
    const totalPart = `Rs${lineTotal}`.padStart(priceColWidth);
    encoder.line(`${namePart.padEnd(nameColWidth)}  ${qtyPart} ${totalPart}`);
    
    const sku = product.sku || '';
    const price = priceNum.toFixed(2);
    const gst = product.gst_percent ? `${product.gst_percent}% GST` : '';
    encoder.text(`  ${sku} @ Rs${price} ${gst}\n`);
  });
  
  encoder.divider('-', cols);
  
  // Totals
  const subtotal = invoice.total_amount - (invoice.tax_amount || 0) + (invoice.discount || 0);
  
  const labelWidth = cols - priceColWidth - 1;
  const formatTotalLine = (label: string, value: number) => {
    return `${label.padEnd(labelWidth)} Rs${value.toFixed(2).padStart(priceColWidth - 3)}`;
  };
  
  encoder.line(formatTotalLine("Subtotal:", subtotal));
  if (settings?.receipt_show_gst && invoice.tax_amount) {
    encoder.line(formatTotalLine("GST (Tax):", invoice.tax_amount));
  }
  if (invoice.discount) {
    encoder.line(formatTotalLine("Discount:", -invoice.discount));
  }
  
  encoder.divider('=', cols);
  
  // Grand Total
  encoder.bold(true).sizeDouble();
  const grandTotalLabel = "TOTAL:".padEnd(Math.floor(cols / 2) - 3);
  const grandTotalVal = `Rs${invoice.total_amount.toFixed(2)}`.padStart(Math.floor(cols / 2) + 2);
  encoder.line(`${grandTotalLabel}${grandTotalVal}`);
  
  encoder.bold(false).sizeNormal();
  encoder.divider('-', cols);
  
  // Payment Method
  encoder.line(`Payment: ${invoice.payment_method?.toUpperCase()}`);
  if (invoice.payment_method === 'cash' && options?.amountTendered !== undefined) {
    encoder.line(formatTotalLine("Tendered:", options.amountTendered));
    encoder.line(formatTotalLine("Change:", options.changeDue || 0));
  }
  
  encoder.divider('-', cols);
  
  // Footer
  encoder.alignCenter();
  if (settings?.receipt_footer) {
    encoder.line(settings.receipt_footer);
  } else {
    encoder.bold(true).line("THANK YOU FOR YOUR PURCHASE!").bold(false);
    encoder.line("Please retain this receipt");
    encoder.line("No returns without receipt.");
  }
  
  encoder.text("\nPowered by Bill-Dale POS\n\n\n\n");
  
  if (settings?.receipt_auto_cut !== false) {
    encoder.cut();
  }
  
  return encoder.getBuffer();
}

export async function printTestPage(paperWidth: '80mm' | '58mm'): Promise<void> {
  const cols = paperWidth === '58mm' ? 32 : 42;
  const encoder = new EscPosEncoder();
  
  encoder.alignCenter().sizeDouble().bold(true).line("BILL-DALE POS");
  encoder.sizeNormal().bold(false).line("Direct Thermal Printing Test");
  encoder.divider('-', cols);
  
  encoder.alignLeft().line("Connection: USB/Serial Direct");
  encoder.line(`Paper size: ${paperWidth} (${cols} columns)`);
  
  encoder.lineFeed().line("Standard characters: OK");
  encoder.bold(true).line("Bold characters: OK").bold(false);
  
  encoder.alignCenter();
  encoder.text("1 2 3 4 5 6 7 8 9 0\n");
  encoder.divider('=', cols);
  encoder.bold(true).line("TEST SUCCESSFUL").bold(false);
  encoder.lineFeed(3);
  encoder.cut();
  
  await writeRaw(encoder.getBuffer());
}
