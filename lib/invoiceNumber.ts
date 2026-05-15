import db from '@/offline/db';

/**
 * Generate the next invoice number in format: BD-{BRANCH_CODE}-{YYYY}-{NNNNNN}
 * e.g. BD-KLP-2026-000042
 *
 * Reads all existing invoices for this business/branch to find the highest sequence number.
 */
export async function generateInvoiceNumber(
  branchId: string,
  branchName: string
): Promise<string> {
  const year = new Date().getFullYear().toString();
  const branchCode = branchName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);

  // Find the highest existing invoice number for this branch/year
  const allInvoices = await db.invoices
    .where('branch_id')
    .equals(branchId)
    .toArray();

  let maxSeq = 0;
  const prefix = `BD-${branchCode}-${year}-`;
  allInvoices.forEach((inv) => {
    if (inv.invoice_number?.startsWith(prefix)) {
      const seq = parseInt(inv.invoice_number.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(6, '0');
  return `${prefix}${nextSeq}`;
}
