/**
 * Format a number as Indian Rupees: ₹1,20,202.54
 * Uses Indian number system (2-2-3 grouping)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format as compact INR without the Intl grouping, just prefix symbol
 * e.g. ₹2202.54
 */
export function formatINRCompact(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
