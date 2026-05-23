// ─── Receipt Settings Types ────────────────────────────────────────
// All fields are optional on BusinessSettings for backward compatibility.
// Defaults are defined in receipt-constants.ts.

/* ── Section 1: Business Information ── */
export interface ReceiptBusinessInfo {
  receipt_store_name?: string;
  receipt_legal_name?: string;
  receipt_address?: string;
  receipt_phone?: string;
  receipt_email?: string;
  receipt_website?: string;
  receipt_gstin?: string;
  receipt_fssai?: string;
  receipt_branch_name?: string;
  receipt_support_contact?: string;
  // Visibility toggles (true = show on receipt)
  receipt_show_store_name?: boolean;
  receipt_show_legal_name?: boolean;
  receipt_show_address?: boolean;
  receipt_show_phone?: boolean;
  receipt_show_email?: boolean;
  receipt_show_website?: boolean;
  receipt_show_gstin?: boolean;
  receipt_show_fssai?: boolean;
  receipt_show_branch_name?: boolean;
  receipt_show_support_contact?: boolean;
}

/* ── Section 2: Content Customization ── */
export interface ReceiptContent {
  receipt_header?: string;       // already exists
  receipt_footer?: string;       // already exists
  receipt_thank_you_msg?: string;
  receipt_promo_msg?: string;
  receipt_seasonal_msg?: string;
  receipt_return_policy?: string;
  receipt_exchange_policy?: string;
}

/* ── Section 3: Branding & Visuals ── */
export type LogoPosition = 'left' | 'center' | 'right';

export interface ReceiptBranding {
  receipt_logo_url?: string;     // already exists
  receipt_logo_position?: LogoPosition;
  receipt_logo_size?: number;    // px height, 30-120
  receipt_watermark_url?: string;
  receipt_qr_data?: string;      // data to encode in QR
  receipt_show_qr?: boolean;
  receipt_social_instagram?: string;
  receipt_social_facebook?: string;
  receipt_social_twitter?: string;
  receipt_social_youtube?: string;
  receipt_show_social_qr?: boolean;
  receipt_brand_color?: string;  // hex color for preview accent
}

/* ── Section 4: Layout Settings ── */
export type DividerStyle = 'dashed' | 'solid' | 'double' | 'dotted' | 'none';
export type LayoutMode = 'compact' | 'detailed';
export type TextAlignment = 'left' | 'center';

export interface ReceiptLayout {
  receipt_paper_size?: '80mm' | '58mm' | 'A4';  // A4 added for document invoices
  receipt_font_size?: number;    // pt, 7-12
  receipt_layout_mode?: LayoutMode;
  receipt_margin_top?: number;   // mm
  receipt_margin_bottom?: number;
  receipt_line_spacing?: number; // multiplier 1.0-2.0
  receipt_divider_style?: DividerStyle;
  receipt_text_alignment?: TextAlignment;
  receipt_show_borders?: boolean;
}

/* ── Section 5: Tax & Payment Display ── */
export interface ReceiptTaxDisplay {
  receipt_show_gst?: boolean;           // already exists
  receipt_show_cgst_sgst?: boolean;
  receipt_show_igst?: boolean;
  receipt_show_discount_breakdown?: boolean;
  receipt_show_coupon?: boolean;
  receipt_show_saved_amount?: boolean;
  receipt_show_payment_method?: boolean;
  receipt_show_change_returned?: boolean;
  receipt_show_round_off?: boolean;
  receipt_show_taxable_value?: boolean;
}

/* ── Section 6: Customer Information ── */
export interface ReceiptCustomerDisplay {
  receipt_show_customer_name?: boolean;
  receipt_show_customer_phone?: boolean;
  receipt_show_loyalty_id?: boolean;
  receipt_show_loyalty_points?: boolean;
  receipt_show_membership_tier?: boolean;
  receipt_show_customer_notes?: boolean;
  // Privacy
  receipt_mask_customer_phone?: boolean;
  receipt_hide_customer_on_duplicate?: boolean;
}

/* ── Section 7: Print Options ── */
export interface ReceiptPrintOptions {
  receipt_auto_print?: boolean;
  receipt_duplicate_print?: boolean;
  receipt_silent_print?: boolean;
  receipt_num_copies?: number;
  receipt_thermal_optimization?: boolean;
  receipt_ink_saving?: boolean;
  receipt_dark_mode?: boolean;
}

/* ── Section 8: Digital Receipts ── */
export interface ReceiptDigitalOptions {
  receipt_sms_enabled?: boolean;
  receipt_email_enabled?: boolean;
  receipt_whatsapp_enabled?: boolean;
  receipt_qr_digital_link?: boolean;
  receipt_pdf_download?: boolean;
  receipt_email_subject?: string;
  receipt_sms_template?: string;
  receipt_whatsapp_template?: string;
}

/* ── Section 9: Template Entity ── */
export interface ReceiptTemplate {
  id: string;
  name: string;
  business_id: string;
  is_default: boolean;
  theme: ReceiptTheme;
  // Snapshot of all receipt-related settings at time of save
  settings: ReceiptSettingsSnapshot;
  created_at: string;
  updated_at: string;
}

export type ReceiptTheme = 'default' | 'festival' | 'restaurant' | 'retail' | 'pharmacy' | 'minimal';

export interface ReceiptSettingsSnapshot extends
  ReceiptBusinessInfo,
  ReceiptContent,
  ReceiptBranding,
  ReceiptLayout,
  ReceiptTaxDisplay,
  ReceiptCustomerDisplay,
  ReceiptPrintOptions,
  ReceiptDigitalOptions {}

/* ── Merged type for BusinessSettings extension ── */
export interface ReceiptSettingsFields extends ReceiptSettingsSnapshot {}

/* ── Dynamic Placeholders ── */
export type ReceiptPlaceholder =
  | '{customer_name}'
  | '{invoice_id}'
  | '{date}'
  | '{cashier}'
  | '{branch_name}'
  | '{loyalty_points}'
  | '{store_name}'
  | '{total_amount}';

export interface PlaceholderMeta {
  key: ReceiptPlaceholder;
  label: string;
  example: string;
}
