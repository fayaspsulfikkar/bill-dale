/**
 * GST breakdown utility.
 * 
 * For intra-state sales: GST splits into CGST + SGST (half each).
 * For inter-state sales (or unknown): apply IGST.
 * 
 * `businessState` and `customerState` are short state codes, e.g. "KL", "TN", "MH"
 */
export interface GSTBreakdown {
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  isIGST: boolean;
}

export function computeGSTBreakdown(
  taxableValue: number,
  gstRate: number,
  businessState?: string,
  customerState?: string
): GSTBreakdown {
  const isIGST = !!(businessState && customerState && businessState !== customerState);
  const totalTax = (taxableValue * gstRate) / 100;
  const half = totalTax / 2;

  return {
    taxableValue,
    gstRate,
    cgst: isIGST ? 0 : half,
    sgst: isIGST ? 0 : half,
    igst: isIGST ? totalTax : 0,
    totalTax,
    isIGST,
  };
}

/**
 * Aggregate GST breakdown across multiple line items.
 */
export interface AggregateGST {
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  isIGST: boolean;
  rateGroups: { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[];
}

export function aggregateGST(
  items: { taxableValue: number; gstRate: number }[],
  businessState?: string,
  customerState?: string
): AggregateGST {
  const isIGST = !!(businessState && customerState && businessState !== customerState);
  const rateMap: Record<number, { taxable: number; cgst: number; sgst: number; igst: number }> = {};

  items.forEach(({ taxableValue, gstRate }) => {
    if (!rateMap[gstRate]) rateMap[gstRate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    const tax = (taxableValue * gstRate) / 100;
    rateMap[gstRate].taxable += taxableValue;
    if (isIGST) rateMap[gstRate].igst += tax;
    else { rateMap[gstRate].cgst += tax / 2; rateMap[gstRate].sgst += tax / 2; }
  });

  const rateGroups = Object.entries(rateMap).map(([rate, v]) => ({ rate: parseFloat(rate), ...v }));

  return {
    totalTaxable: rateGroups.reduce((s, r) => s + r.taxable, 0),
    totalCGST: rateGroups.reduce((s, r) => s + r.cgst, 0),
    totalSGST: rateGroups.reduce((s, r) => s + r.sgst, 0),
    totalIGST: rateGroups.reduce((s, r) => s + r.igst, 0),
    totalTax: rateGroups.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0),
    isIGST,
    rateGroups,
  };
}
