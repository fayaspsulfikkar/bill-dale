import Dexie, { type EntityTable } from 'dexie';
import type { ReceiptTemplate, LogoPosition, DividerStyle, LayoutMode, TextAlignment } from '@/components/settings/receipts/receipt-types';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'owner' | 'manager' | 'cashier' | 'inventory_staff' | 'accountant' | 'custom' | 'admin' | 'staff';
  branch_id: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  logo_url?: string;
  owner_name?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  pincode?: string;
  invoice_prefix: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  upi_id?: string;
  signature_url?: string;
  admin_pin?: string;
  tax_type: 'regular' | 'composition';
  created_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'cashier' | 'inventory_staff' | 'accountant' | 'custom' | 'admin' | 'staff';
  permissions: string[];
  joined_at: string;
}

export interface StaffInvitation {
  id: string;
  business_id: string;
  token: string;
  invited_by: string;
  email?: string;
  role: 'staff' | 'admin';
  permissions: string[];
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
  synced?: boolean;
}

export interface Notification {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  body?: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  branch_code?: string;
  address?: string; // made optional to not break existing records immediately
  contact_person?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'temporarily_closed' | 'under_maintenance' | 'archived';
  opening_date?: string;
  password?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  gst_percent: number;
  image_url?: string;
  low_stock_threshold?: number;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string;
  stock: number;
  last_updated: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  loyalty_points: number;
  wallet_balance: number;
  membership_tier: 'standard' | 'silver' | 'gold' | 'platinum';
  created_at: string;
  synced?: boolean;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  branch_id: string;
  user_id: string;
  customer_id?: string;
  total_amount: number;
  tax_amount: number;
  discount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'split' | 'store_credit' | 'credit_sale';
  payment_details?: Record<string, unknown>; // stores split breakdown, reference IDs etc
  notes?: string;
  staff_name?: string;
  status: 'completed' | 'refunded' | 'partial_refund';
  created_at: string;
  synced?: boolean;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name?: string; // snapshot at time of sale (for custom items)
  quantity: number;
  price: number;
  gst_amount: number;
  item_discount?: number;
  override_price?: number;
  is_custom_item?: boolean;
}

export interface HeldOrder {
  id: string;
  business_id: string;
  branch_id: string;
  user_id: string;
  user_name?: string;
  customer_id?: string;
  customer_name?: string;
  items: string; // JSON stringified CartItem[]
  discount: number;
  notes?: string;
  total_amount: number;
  created_at: string;
}

export interface CashRegister {
  id: string;
  branch_id: string;
  business_id: string;
  opened_by: string;
  closed_by?: string;
  date: string; // YYYY-MM-DD
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  cash_sales: number;
  cash_refunds: number;
  closing_balance?: number;
  expected_cash?: number;
  difference?: number;
  notes?: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

export interface Coupon {
  id: string;
  business_id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  min_order?: number;
  max_discount?: number;
  expiry?: string;
  is_active: boolean;
  used_count: number;
  created_at: string;
}

export interface ManagerApproval {
  id: string;
  business_id: string;
  branch_id: string;
  action: string;
  approved_by: string;
  staff_id: string;
  reason?: string;
  timestamp: string;
}

export interface ReturnOrder {
  id: string;
  original_invoice_id: string;
  branch_id: string;
  business_id: string;
  user_id: string;
  customer_id?: string;
  items: string; // JSON stringified
  refund_amount: number;
  reason: string;
  reason_note?: string;
  status: 'completed' | 'pending';
  exchange_invoice_id?: string;
  created_at: string;
  synced?: boolean;
}

export interface Refund {
  id: string;
  invoice_id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
  synced?: boolean;
}

export interface StaffMember {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  role_title: string;
  is_active: boolean;
  branch_ids?: string[];
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  receipt_header?: string;
  receipt_footer?: string;
  receipt_logo_url?: string;
  receipt_paper_size: '80mm' | '58mm';
  receipt_show_gst: boolean;
  
  // App Preferences
  currency_code?: string;
  currency_symbol?: string;
  pos_quick_add?: boolean;
  pos_sound_effects?: boolean;
  low_stock_threshold?: number;

  // Tax & Invoicing
  default_gst_rate?: number;
  invoice_prefix?: string;
  invoice_start_number?: number;
  invoice_number_padding?: number;
  invoice_reset_cycle?: 'never' | 'monthly' | 'yearly';
  tax_inclusive_pricing?: boolean;
  return_invoice_templates?: boolean;

  // Display & Formatting
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format?: '12h' | '24h';
  decimal_places?: number;

  // POS Behavior
  default_payment_method?: 'cash' | 'card' | 'upi';
  staff_mode_default_minutes?: number;
  auto_session_timeout_minutes?: number;
  barcode_format?: 'ean13' | 'code128' | 'qr';
  pos_auto_cart_recovery?: boolean;
  pos_auto_print_receipt?: boolean;
  pos_barcode_autofocus?: boolean;
  pos_session_persistence?: boolean;

  // Business Hours & Info
  business_timezone?: string;
  business_multi_branch_enabled?: boolean;
  business_multi_language?: string;

  // Business Hours (informational for analytics)
  business_hours_open?: string;
  business_hours_close?: string;
  business_days?: string[];

  // Notifications
  notify_low_stock?: boolean;
  notify_daily_summary?: boolean;
  notify_sync_failures?: boolean;

  updated_at: string;

  // ── Security Settings ──
  security_pin_length?: 4 | 6;
  security_auto_lock_enabled?: boolean;
  security_auto_lock_minutes?: number;
  security_lock_on_minimize?: boolean;
  security_lock_after_sale?: boolean;
  security_require_pin_unlock?: boolean;
  security_show_lock_countdown?: boolean;
  security_failed_attempts_limit?: number;
  security_cooldown_minutes?: number;
  security_notify_admin_failed?: boolean;
  security_require_admin_unlock?: boolean;
  security_require_pin_on_open?: boolean;
  security_require_admin_new_device?: boolean;
  security_allow_trusted_devices_only?: boolean;
  security_staff_branch_only?: boolean;
  security_admin_pin_switch_branch?: boolean;
  security_prevent_unlink_branch?: boolean;
  security_restrict_inventory_branch?: boolean;
  security_restrict_reports_branch?: boolean;
  security_mask_customer_phone?: boolean;
  security_hide_credit_balance?: boolean;
  security_hide_profit_non_admin?: boolean;
  security_admin_pin_export_data?: boolean;
  security_admin_pin_clear_data?: boolean;
  security_admin_pin_restore_backup?: boolean;
  security_log_data_exports?: boolean;
  security_admin_pin_critical_settings?: boolean;
  security_admin_pin_manage_staff?: boolean;
  security_admin_pin_tax_settings?: boolean;
  security_admin_pin_unlink_branch?: boolean;
  security_pin_required_actions?: string[];
  security_discount_pin_threshold?: number;
  security_role_permissions?: Record<string, Record<string, boolean>>;
  security_pin_last_changed?: string;
  security_pin_changed_by?: string;

  // Authentication & Trust (Phase 3.2)
  security_2fa_enabled?: boolean;
  security_otp_login_enabled?: boolean;
  security_device_trust_management?: boolean;
  security_login_anomaly_detection?: boolean;

  // Advanced RBAC (Phase 3.2)
  security_custom_roles_enabled?: boolean;
  security_department_restrictions?: boolean;

  // Session Security (Phase 3.2)
  security_concurrent_sessions_limit?: number; // 0 = unlimited
  security_device_activity_tracking?: boolean;

  // Audit Logs (Phase 3.2)
  security_audit_export_enabled?: boolean;
  security_audit_risk_tagging?: boolean;

  // ── Receipt Customization (v7) ──
  // Business Info
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
  // Content
  receipt_thank_you_msg?: string;
  receipt_promo_msg?: string;
  receipt_seasonal_msg?: string;
  receipt_return_policy?: string;
  receipt_exchange_policy?: string;
  // Branding
  receipt_logo_position?: LogoPosition;
  receipt_logo_size?: number;
  receipt_watermark_url?: string;
  receipt_qr_data?: string;
  receipt_show_qr?: boolean;
  receipt_social_instagram?: string;
  receipt_social_facebook?: string;
  receipt_social_twitter?: string;
  receipt_social_youtube?: string;
  receipt_show_social_qr?: boolean;
  receipt_brand_color?: string;
  // Layout
  receipt_font_size?: number;
  receipt_layout_mode?: LayoutMode;
  receipt_margin_top?: number;
  receipt_margin_bottom?: number;
  receipt_line_spacing?: number;
  receipt_divider_style?: DividerStyle;
  receipt_text_alignment?: TextAlignment;
  receipt_show_borders?: boolean;
  // Tax & Payment Display
  receipt_show_cgst_sgst?: boolean;
  receipt_show_igst?: boolean;
  receipt_show_discount_breakdown?: boolean;
  receipt_show_coupon?: boolean;
  receipt_show_saved_amount?: boolean;
  receipt_show_payment_method?: boolean;
  receipt_show_change_returned?: boolean;
  receipt_show_round_off?: boolean;
  receipt_show_taxable_value?: boolean;
  // Customer Display
  receipt_show_customer_name?: boolean;
  receipt_show_customer_phone?: boolean;
  receipt_show_loyalty_id?: boolean;
  receipt_show_loyalty_points?: boolean;
  receipt_show_membership_tier?: boolean;
  receipt_show_customer_notes?: boolean;
  receipt_mask_customer_phone?: boolean;
  receipt_hide_customer_on_duplicate?: boolean;
  // Print Options
  receipt_auto_print?: boolean;
  receipt_duplicate_print?: boolean;
  receipt_silent_print?: boolean;
  receipt_num_copies?: number;
  receipt_thermal_optimization?: boolean;
  receipt_ink_saving?: boolean;
  receipt_dark_mode?: boolean;

  // Enterprise Receipt Features (Phase 3.3)
  receipt_qr_payload?: 'invoice_link' | 'upi_payment' | 'none';
  receipt_language?: string;
  receipt_visual_editor_enabled?: boolean;
  // Digital Receipts
  receipt_sms_enabled?: boolean;
  receipt_email_enabled?: boolean;
  receipt_whatsapp_enabled?: boolean;
  receipt_qr_digital_link?: boolean;
  receipt_pdf_download?: boolean;
  receipt_email_subject?: string;
  receipt_sms_template?: string;
  receipt_whatsapp_template?: string;
  receipt_whatsapp_template?: string;

  // ── Users & Staff (Phase 4) ──
  staff_management_enabled?: boolean;
  staff_attendance_tracking?: boolean;
  staff_performance_metrics?: boolean;
  staff_shift_management?: boolean;

  // ── Payments & Gateways (Phase 4) ──
  payment_allow_split?: boolean;
  payment_allow_tips?: boolean;
  payment_auto_refunds?: boolean;
  payment_gateway_stripe_enabled?: boolean;
  payment_gateway_stripe_key?: string;
  payment_gateway_razorpay_enabled?: boolean;
  payment_gateway_razorpay_key?: string;

  // ── Advanced Inventory Rules (Phase 4) ──
  inventory_expiry_tracking?: boolean;
  inventory_batch_tracking?: boolean;
  inventory_auto_reorder?: boolean;
  inventory_sku_generation_format?: string;
  inventory_barcode_generation?: 'ean13' | 'code128' | 'qr';

  // ── Customers & Loyalty Engine (Phase 4) ──
  loyalty_program_enabled?: boolean;
  loyalty_points_per_currency?: number;
  loyalty_min_redemption_points?: number;
  loyalty_enable_store_credits?: boolean;
  loyalty_enable_referrals?: boolean;
  loyalty_tiers_config?: Record<string, unknown>; // Stores tiers like Silver/Gold/Platinum rules

  // ── Notification Center (Phase 4) ──
  notification_email_provider?: 'smtp' | 'sendgrid' | 'resend';
  notification_whatsapp_provider?: 'twilio' | 'meta';
  notification_sms_provider?: 'twilio' | 'msg91';
  notification_api_keys?: Record<string, string>;

  // ── Third-Party Integrations (Phase 4) ──
  integration_shopify_enabled?: boolean;
  integration_woocommerce_enabled?: boolean;
  integration_tally_sync?: boolean;
  integration_zoho_sync?: boolean;
  integration_webhooks?: Array<{ url: string; events: string[] }>;

  // ── AI & Automation (Phase 4) ──
  ai_stock_forecasting?: boolean;
  ai_demand_prediction?: boolean;
  ai_fraud_detection?: boolean;
  ai_customer_behavior_analysis?: boolean;
  ai_smart_reorder_suggestions?: boolean;

  // ── Appearance & Branding (Phase 4) ──
  appearance_theme?: 'light' | 'dark' | 'system';
  appearance_accent_color?: string;
  appearance_compact_mode?: boolean;
  appearance_dashboard_layout?: 'standard' | 'dense' | 'analytics_first';

  // ── Advanced Diagnostics (Phase 4) ──
  advanced_developer_mode?: boolean;
  advanced_api_management?: boolean;
  advanced_performance_analytics?: boolean;
  advanced_experimental_features?: boolean;
}

export interface StockTransfer {
  id: string;
  business_id: string;
  source_branch_id: string;
  dest_branch_id: string;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  notes?: string;
  created_at: string;
  received_at?: string;
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
}

export interface SyncQueue {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: unknown;
  timestamp: string;
}

export type { ReceiptTemplate };

const db = new Dexie('BillDaleDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  businesses: EntityTable<Business, 'id'>;
  business_members: EntityTable<BusinessMember, 'id'>;
  staff_invitations: EntityTable<StaffInvitation, 'id'>;
  activity_logs: EntityTable<ActivityLog, 'id'>;
  notifications: EntityTable<Notification, 'id'>;
  branches: EntityTable<Branch, 'id'>;
  products: EntityTable<Product, 'id'>;
  inventory: EntityTable<Inventory, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  invoices: EntityTable<Invoice, 'id'>;
  invoice_items: EntityTable<InvoiceItem, 'id'>;
  held_orders: EntityTable<HeldOrder, 'id'>;
  cash_registers: EntityTable<CashRegister, 'id'>;
  coupons: EntityTable<Coupon, 'id'>;
  manager_approvals: EntityTable<ManagerApproval, 'id'>;
  return_orders: EntityTable<ReturnOrder, 'id'>;
  refunds: EntityTable<Refund, 'id'>;
  staff_members: EntityTable<StaffMember, 'id'>;
  sync_queue: EntityTable<SyncQueue, 'id'>;
  stock_transfers: EntityTable<StockTransfer, 'id'>;
  stock_transfer_items: EntityTable<StockTransferItem, 'id'>;
  business_settings: EntityTable<BusinessSettings, 'id'>;
  receipt_templates: EntityTable<ReceiptTemplate, 'id'>;
};

// v1 → existing schema
db.version(1).stores({
  users: 'id, email, role, branch_id',
  branches: 'id, name, is_active',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  invoices: 'id, branch_id, user_id, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  refunds: 'id, invoice_id, synced',
  sync_queue: '++id, table_name, operation',
});

// v2 → new tables for auth, onboarding, RBAC, logs, notifications
db.version(2).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, is_active',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  invoices: 'id, branch_id, user_id, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  refunds: 'id, invoice_id, synced',
  sync_queue: '++id, table_name, operation',
});

// v3 → POS features: customers, held orders, cash register, coupons, returns, approvals
db.version(3).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, is_active',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  sync_queue: '++id, table_name, operation',
});

// v4 → staff_members local table for billing attribution
db.version(4).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, is_active',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  staff_members: 'id, business_id, name, is_active',
  sync_queue: '++id, table_name, operation',
});

// v5 → branch management overhaul
db.version(5).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, status', // Changed is_active to status
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  staff_members: 'id, business_id, name, is_active',
  sync_queue: '++id, table_name, operation',
  stock_transfers: 'id, business_id, source_branch_id, dest_branch_id, status',
  stock_transfer_items: 'id, transfer_id, product_id',
}).upgrade(tx => {
  // Migrate branches: add status and address fields, remove is_active
  return tx.table('branches').toCollection().modify(branch => {
    if (branch.is_active !== undefined) {
      branch.status = branch.is_active ? 'active' : 'inactive';
      delete branch.is_active;
    } else if (!branch.status) {
      branch.status = 'active';
    }
    
    if (branch.location !== undefined) {
      branch.address = branch.location;
      delete branch.location;
    }
    
    if (branch.contact !== undefined) {
      branch.phone = branch.contact;
      delete branch.contact;
    }
  });
});

// v6 → business_settings table for receipt customization
db.version(6).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, status',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  staff_members: 'id, business_id, name, is_active',
  sync_queue: '++id, table_name, operation',
  stock_transfers: 'id, business_id, source_branch_id, dest_branch_id, status',
  stock_transfer_items: 'id, transfer_id, product_id',
  business_settings: 'id, business_id',
});

// v7 → receipt_templates for template management
db.version(7).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, status',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  staff_members: 'id, business_id, name, is_active',
  sync_queue: '++id, table_name, operation',
  stock_transfers: 'id, business_id, source_branch_id, dest_branch_id, status',
  business_settings: 'id, business_id',
  receipt_templates: 'id, business_id, is_default',
});

// v8 → Enterprise settings expansion (no new indexes needed, just schema bump for safety)
db.version(8).stores({
  users: 'id, email, role, branch_id',
  businesses: 'id, name',
  business_members: 'id, business_id, user_id, role',
  staff_invitations: 'id, business_id, token, accepted_at',
  activity_logs: 'id, business_id, user_id, action, synced',
  notifications: 'id, business_id, user_id, read',
  branches: 'id, name, status',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  customers: 'id, business_id, phone, email, synced',
  invoices: 'id, branch_id, user_id, customer_id, invoice_number, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  held_orders: 'id, business_id, branch_id, user_id, customer_id',
  cash_registers: 'id, branch_id, business_id, date, status',
  coupons: 'id, business_id, code, is_active',
  manager_approvals: 'id, business_id, branch_id, action',
  return_orders: 'id, original_invoice_id, branch_id, business_id, synced',
  refunds: 'id, invoice_id, synced',
  staff_members: 'id, business_id, name, is_active',
  sync_queue: '++id, table_name, operation',
  stock_transfers: 'id, business_id, source_branch_id, dest_branch_id, status',
  stock_transfer_items: 'id, transfer_id, product_id',
  business_settings: 'id, business_id',
  receipt_templates: 'id, business_id, is_default',
}).upgrade(tx => {
  // Ensure all existing business_settings records get default enterprise config values if missing
  return tx.table('business_settings').toCollection().modify(setting => {
    // Scaffold default AI settings safely
    if (setting.ai_stock_forecasting === undefined) setting.ai_stock_forecasting = false;
    if (setting.ai_fraud_detection === undefined) setting.ai_fraud_detection = false;
    
    // Scaffold default Appearance settings safely
    if (setting.appearance_theme === undefined) setting.appearance_theme = 'system';
    
    // Scaffold loyalty defaults safely
    if (setting.loyalty_program_enabled === undefined) setting.loyalty_program_enabled = false;
  });
});

export type { db };
export default db;
