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
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string;
  stock: number;
  last_updated: string;
}

export interface Invoice {
  id: string;
  branch_id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  discount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'split';
  status: 'completed' | 'refunded';
  created_at: string;
  synced?: boolean;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  price: number;
  gst_amount: number;
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
  invoices: EntityTable<Invoice, 'id'>;
  invoice_items: EntityTable<InvoiceItem, 'id'>;
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

export type { db };
export default db;
