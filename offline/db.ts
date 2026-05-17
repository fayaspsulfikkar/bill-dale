import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'admin' | 'staff';
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
  role: 'admin' | 'staff';
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
  location: string;
  contact: string;
  is_active: boolean;
  branch_code?: string;
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
  sync_queue: EntityTable<SyncQueue, 'id'>;
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

export type { db };
export default db;
