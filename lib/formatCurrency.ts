import db from '@/offline/db';

// ── Currency locale map ──────────────────────────────────────
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
  AED: 'ar-AE', SAR: 'ar-SA', JPY: 'ja-JP', CNY: 'zh-CN',
  SGD: 'en-SG', MYR: 'ms-MY', BDT: 'bn-BD', PKR: 'ur-PK',
  LKR: 'si-LK', NPR: 'ne-NP', AUD: 'en-AU', CAD: 'en-CA',
  CHF: 'de-CH', KRW: 'ko-KR', THB: 'th-TH', IDR: 'id-ID',
};

// ── In-memory cache ──────────────────────────────────────────
let _currencyCode: string = 'INR';
let _decimalPlaces: number = 2;
let _cacheLoaded = false;

async function loadCurrencyCache() {
  if (_cacheLoaded) return;
  try {
    const settings = await db.business_settings.toCollection().first();
    if (settings?.currency_code) _currencyCode = settings.currency_code;
    if (settings?.decimal_places !== undefined) _decimalPlaces = settings.decimal_places;
  } catch {
    // Dexie not available (SSR) — keep defaults
  }
  _cacheLoaded = true;
}

/**
 * Update the currency cache with new values and notify all listeners.
 * Call this when settings change so the formatter + UI picks up new values.
 */
export function invalidateCurrencyCache(newCode?: string, newDecimals?: number) {
  if (newCode !== undefined) _currencyCode = newCode;
  if (newDecimals !== undefined) _decimalPlaces = newDecimals;
  _cacheLoaded = true; // values are already set, no need to re-read from Dexie

  // Dispatch event so React components can re-render
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('currency-changed'));
  }
}

// Kick off cache load eagerly (non-blocking)
if (typeof window !== 'undefined') {
  loadCurrencyCache();
}

// ── Main formatter ───────────────────────────────────────────
/**
 * Format a number as currency using the configured currency from settings.
 * Falls back to INR if settings haven't loaded yet.
 */
export function formatCurrency(amount: number, overrideCode?: string): string {
  const code = overrideCode || _currencyCode;
  const locale = CURRENCY_LOCALE_MAP[code] || 'en-US';
  const decimals = overrideCode ? 2 : _decimalPlaces;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// ── Backward-compat aliases ──────────────────────────────────
/** @deprecated Use formatCurrency() instead */
export const formatINR = formatCurrency;

/** @deprecated Use formatCurrency() instead */
export function formatINRCompact(amount: number): string {
  const symbol = _currencyCode === 'INR' ? '₹' : '';
  return `${symbol}${amount.toFixed(_decimalPlaces)}`;
}
