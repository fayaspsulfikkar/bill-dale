import Dexie, { type EntityTable } from 'dexie';

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

  // Display & Formatting
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format?: '12h' | '24h';
  decimal_places?: number;

  // POS Behavior
  default_payment_method?: 'cash' | 'card' | 'upi';
  staff_mode_default_minutes?: number;
  auto_session_timeout_minutes?: number;
  barcode_format?: 'ean13' | 'code128' | 'qr';

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

export type { db };
export default db;
