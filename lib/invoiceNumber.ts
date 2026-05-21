import db from '@/offline/db';

/**
 * Generate the next invoice number using settings-configured format.
 * 
 * Format: {prefix}{BRANCH_CODE}-{YYYY}-{padded_sequence}
 * e.g. INV-KLP-2026-0042  or  BD-MAIN-2026-001
 *
 * Falls back to "INV-" prefix, 4-digit padding if no settings are configured.
 */
export async function generateInvoiceNumber(
  branchId: string,
  branchName: string,
  businessId?: string
): Promise<string> {
  const year = new Date().getFullYear().toString();
  const branchCode = branchName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);

  // Read invoice settings
  let invoicePrefix = 'INV-';
  let padding = 4;
  let startNumber = 1;

  if (businessId) {
    try {
      const settings = await db.business_settings
        .where('business_id')
        .equals(businessId)
        .first();
      if (settings) {
        if (settings.invoice_prefix) invoicePrefix = settings.invoice_prefix;
        if (settings.invoice_number_padding) padding = settings.invoice_number_padding;
        if (settings.invoice_start_number) startNumber = settings.invoice_start_number;
      }
    } catch {
      // Dexie not ready — use defaults
    }
  }

  // Find the highest existing invoice number for this branch/year
  const allInvoices = await db.invoices
    .where('branch_id')
    .equals(branchId)
    .toArray();

  const prefix = `${invoicePrefix}${branchCode}-${year}-`;
  let maxSeq = startNumber - 1;

  allInvoices.forEach((inv) => {
    if (inv.invoice_number?.startsWith(prefix)) {
      const seq = parseInt(inv.invoice_number.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  // Also check legacy "BD-" prefix invoices for continuity
  const legacyPrefix = `BD-${branchCode}-${year}-`;
  if (invoicePrefix !== 'BD-') {
    allInvoices.forEach((inv) => {
      if (inv.invoice_number?.startsWith(legacyPrefix)) {
        const seq = parseInt(inv.invoice_number.slice(legacyPrefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
  }

  const nextSeq = (maxSeq + 1).toString().padStart(padding, '0');
  return `${prefix}${nextSeq}`;
}
