import type {
  ReceiptSettingsSnapshot,
  PlaceholderMeta,
  ReceiptTheme,
  DividerStyle,
  LayoutMode,
  LogoPosition,
  TextAlignment,
} from './receipt-types';

// ─── Default Settings ─────────────────────────────────────────────
export const RECEIPT_DEFAULTS: ReceiptSettingsSnapshot = {
  // Business Info
  receipt_store_name: '',
  receipt_legal_name: '',
  receipt_address: '',
  receipt_phone: '',
  receipt_email: '',
  receipt_website: '',
  receipt_gstin: '',
  receipt_fssai: '',
  receipt_branch_name: '',
  receipt_support_contact: '',
  receipt_show_store_name: true,
  receipt_show_legal_name: false,
  receipt_show_address: true,
  receipt_show_phone: true,
  receipt_show_email: false,
  receipt_show_website: false,
  receipt_show_gstin: true,
  receipt_show_fssai: false,
  receipt_show_branch_name: false,
  receipt_show_support_contact: false,

  // Content
  receipt_header: '',
  receipt_footer: '',
  receipt_thank_you_msg: 'Thank you for your purchase!',
  receipt_promo_msg: '',
  receipt_seasonal_msg: '',
  receipt_return_policy: '',
  receipt_exchange_policy: '',
  receipt_language: 'en',

  // Branding
  receipt_logo_url: '',
  receipt_logo_position: 'center',
  receipt_logo_size: 60,
  receipt_watermark_url: '',
  receipt_qr_data: '',
  receipt_show_qr: false,
  receipt_social_instagram: '',
  receipt_social_facebook: '',
  receipt_social_twitter: '',
  receipt_social_youtube: '',
  receipt_show_social_qr: false,
  receipt_brand_color: '#000000',
  receipt_qr_payload: 'none',

  // Layout
  receipt_paper_size: '80mm',
  receipt_font_size: 9,
  receipt_layout_mode: 'detailed',
  receipt_margin_top: 6,
  receipt_margin_bottom: 6,
  receipt_line_spacing: 1.4,
  receipt_divider_style: 'dashed',
  receipt_text_alignment: 'left',
  receipt_show_borders: false,

  // Tax & Payment
  receipt_show_gst: true,
  receipt_show_cgst_sgst: false,
  receipt_show_igst: false,
  receipt_show_discount_breakdown: true,
  receipt_show_coupon: true,
  receipt_show_saved_amount: false,
  receipt_show_payment_method: true,
  receipt_show_change_returned: true,
  receipt_show_round_off: false,
  receipt_show_taxable_value: false,

  // Customer
  receipt_show_customer_name: true,
  receipt_show_customer_phone: false,
  receipt_show_loyalty_id: false,
  receipt_show_loyalty_points: false,
  receipt_show_membership_tier: false,
  receipt_show_customer_notes: false,
  receipt_mask_customer_phone: false,
  receipt_hide_customer_on_duplicate: false,

  // Print
  receipt_auto_print: false,
  receipt_duplicate_print: false,
  receipt_silent_print: false,
  receipt_num_copies: 1,
  receipt_thermal_optimization: true,
  receipt_ink_saving: false,
  receipt_dark_mode: false,

  // Digital
  receipt_sms_enabled: false,
  receipt_email_enabled: false,
  receipt_whatsapp_enabled: false,
  receipt_qr_digital_link: false,
  receipt_pdf_download: false,
  receipt_email_subject: 'Your receipt from {store_name}',
  receipt_sms_template: 'Thank you for shopping at {store_name}! Invoice #{invoice_id}, Total: {total_amount}',
  receipt_whatsapp_template: 'Hi {customer_name}! Here\'s your receipt from {store_name}. Invoice #{invoice_id}, Total: {total_amount}. Thank you!',
  receipt_visual_editor_enabled: false,
};

// ─── Placeholder Definitions ──────────────────────────────────────
export const RECEIPT_PLACEHOLDERS: PlaceholderMeta[] = [
  { key: '{customer_name}', label: 'Customer Name', example: 'Rahul Sharma' },
  { key: '{invoice_id}', label: 'Invoice ID', example: 'INV-0042' },
  { key: '{date}', label: 'Date', example: '23/05/2026' },
  { key: '{cashier}', label: 'Cashier', example: 'Priya M.' },
  { key: '{branch_name}', label: 'Branch', example: 'Main Store' },
  { key: '{loyalty_points}', label: 'Loyalty Points', example: '250' },
  { key: '{store_name}', label: 'Store Name', example: 'FashionHub' },
  { key: '{total_amount}', label: 'Total Amount', example: '₹2,499.00' },
];

// ─── Option Arrays ────────────────────────────────────────────────
export const FONT_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: '7pt', value: 7 },
  { label: '8pt', value: 8 },
  { label: '9pt', value: 9 },
  { label: '10pt', value: 10 },
  { label: '11pt', value: 11 },
  { label: '12pt', value: 12 },
];

export const DIVIDER_STYLE_OPTIONS: { label: string; value: DividerStyle }[] = [
  { label: 'Dashed', value: 'dashed' },
  { label: 'Solid', value: 'solid' },
  { label: 'Double', value: 'double' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'None', value: 'none' },
];

export const LAYOUT_MODE_OPTIONS: { label: string; value: LayoutMode }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Detailed', value: 'detailed' },
];

export const LOGO_POSITION_OPTIONS: { label: string; value: LogoPosition }[] = [
  { label: '← Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right →', value: 'right' },
];

export const TEXT_ALIGNMENT_OPTIONS: { label: string; value: TextAlignment }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
];

export const LINE_SPACING_OPTIONS: { label: string; value: number }[] = [
  { label: 'Tight (1.0)', value: 1.0 },
  { label: 'Normal (1.4)', value: 1.4 },
  { label: 'Relaxed (1.6)', value: 1.6 },
  { label: 'Loose (2.0)', value: 2.0 },
];

export const PAPER_SIZE_OPTIONS: { label: string; value: '80mm' | '58mm' | 'A4' }[] = [
  { label: '80mm', value: '80mm' },
  { label: '58mm', value: '58mm' },
  { label: 'A4 Page', value: 'A4' },
];

export const COPY_OPTIONS: { label: string; value: number }[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
];

export const LOGO_SIZE_RANGE = { min: 30, max: 120, step: 5 };

export const MARGIN_RANGE = { min: 0, max: 20, step: 1 };

// ─── Theme Presets ────────────────────────────────────────────────
export interface ThemePreset {
  id: ReceiptTheme;
  label: string;
  description: string;
  emoji: string;
  overrides: Partial<ReceiptSettingsSnapshot>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    label: 'Standard',
    description: 'Clean and professional',
    emoji: '📄',
    overrides: {},
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Only essentials, no extras',
    emoji: '✨',
    overrides: {
      receipt_layout_mode: 'compact',
      receipt_show_email: false,
      receipt_show_website: false,
      receipt_show_fssai: false,
      receipt_show_branch_name: false,
      receipt_show_support_contact: false,
      receipt_show_customer_phone: false,
      receipt_show_loyalty_id: false,
      receipt_show_loyalty_points: false,
      receipt_show_membership_tier: false,
      receipt_show_customer_notes: false,
      receipt_promo_msg: '',
      receipt_seasonal_msg: '',
      receipt_show_qr: false,
      receipt_font_size: 8,
    },
  },
  {
    id: 'festival',
    label: 'Festival / Sale',
    description: 'Highlight promotions and savings',
    emoji: '🎉',
    overrides: {
      receipt_show_saved_amount: true,
      receipt_show_coupon: true,
      receipt_show_discount_breakdown: true,
      receipt_promo_msg: '🎊 Festival Sale! Extra savings inside! 🎊',
      receipt_seasonal_msg: 'Happy festive season from our family to yours!',
      receipt_show_loyalty_points: true,
    },
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Optimized for food & beverage',
    emoji: '🍽️',
    overrides: {
      receipt_layout_mode: 'compact',
      receipt_show_fssai: true,
      receipt_show_cgst_sgst: true,
      receipt_show_customer_name: false,
      receipt_font_size: 8,
      receipt_divider_style: 'solid',
    },
  },
  {
    id: 'retail',
    label: 'Retail',
    description: 'Full details with customer loyalty',
    emoji: '🛍️',
    overrides: {
      receipt_layout_mode: 'detailed',
      receipt_show_customer_name: true,
      receipt_show_loyalty_points: true,
      receipt_show_membership_tier: true,
      receipt_show_saved_amount: true,
      receipt_show_discount_breakdown: true,
      receipt_return_policy: 'Exchange within 7 days with original receipt.',
    },
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    description: 'Compliance-focused with license info',
    emoji: '💊',
    overrides: {
      receipt_show_fssai: true,
      receipt_show_gstin: true,
      receipt_show_legal_name: true,
      receipt_layout_mode: 'detailed',
      receipt_show_customer_name: true,
      receipt_return_policy: 'No returns on medicines. Verify before purchase.',
    },
  },
];

// ─── Mock Billing Data for Preview ────────────────────────────────
export interface MockItem {
  name: string;
  sku: string;
  brand?: string;
  size?: string;
  qty: number;
  price: number;
  gst_percent: number;
}

export const MOCK_ITEMS: MockItem[] = [
  { name: 'Nike Air Max 90', sku: 'NK-AM90-BLK-42', brand: 'Nike', size: '42', qty: 1, price: 8999, gst_percent: 18 },
  { name: 'Adidas Originals Tee', sku: 'AD-OG-TEE-L', brand: 'Adidas', size: 'L', qty: 2, price: 1499, gst_percent: 12 },
  { name: 'Cotton Socks Pack (3)', sku: 'GN-SCK-3PK-F', brand: 'Generic', size: 'Free', qty: 1, price: 299, gst_percent: 5 },
];

export const MOCK_INVOICE = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  invoice_number: 'INV-0042',
  branch_id: 'branch-1',
  user_id: 'user-1',
  customer_id: 'cust-1',
  total_amount: 14351.18,
  tax_amount: 2055.18,
  discount: 500,
  payment_method: 'cash' as const,
  status: 'completed' as const,
  created_at: new Date().toISOString(),
  synced: true,
  staff_name: 'Priya M.',
};

export const MOCK_CUSTOMER = {
  name: 'Rahul Sharma',
  phone: '+91 98765 43210',
  loyalty_id: 'LYL-10042',
  loyalty_points: 250,
  membership_tier: 'Gold' as const,
};

export const MOCK_PAYMENT = {
  amount_tendered: 15000,
  change_due: 648.82,
  round_off: -0.18,
  coupon_code: 'SAVE500',
  coupon_discount: 500,
  saved_amount: 500,
};

// ─── Character Limits ─────────────────────────────────────────────
export const CHAR_LIMITS = {
  receipt_header: 300,
  receipt_footer: 300,
  receipt_thank_you_msg: 200,
  receipt_promo_msg: 200,
  receipt_seasonal_msg: 200,
  receipt_return_policy: 400,
  receipt_exchange_policy: 400,
  receipt_store_name: 60,
  receipt_legal_name: 100,
  receipt_address: 200,
  receipt_phone: 20,
  receipt_email: 60,
  receipt_website: 100,
  receipt_gstin: 15,
  receipt_fssai: 14,
  receipt_branch_name: 60,
  receipt_support_contact: 60,
  receipt_email_subject: 150,
  receipt_sms_template: 160,
  receipt_whatsapp_template: 500,
} as const;

// ─── Sub-navigation sections ──────────────────────────────────────
export interface ReceiptSection {
  id: string;
  label: string;
  emoji: string;
}

export const RECEIPT_SECTIONS: ReceiptSection[] = [
  { id: 'business', label: 'Business Info', emoji: '🏪' },
  { id: 'content', label: 'Content', emoji: '📝' },
  { id: 'branding', label: 'Branding', emoji: '🎨' },
  { id: 'layout', label: 'Layout', emoji: '📐' },
  { id: 'tax', label: 'Tax & Payment', emoji: '💰' },
  { id: 'customer', label: 'Customer Info', emoji: '👤' },
  { id: 'print', label: 'Print Options', emoji: '🖨️' },
  { id: 'digital', label: 'Digital Receipts', emoji: '📱' },
  { id: 'templates', label: 'Templates', emoji: '📋' },
];
