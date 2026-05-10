import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  branch_id: string | null;
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
  data: any;
  timestamp: string;
}

const db = new Dexie('BillDaleDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  branches: EntityTable<Branch, 'id'>;
  products: EntityTable<Product, 'id'>;
  inventory: EntityTable<Inventory, 'id'>;
  invoices: EntityTable<Invoice, 'id'>;
  invoice_items: EntityTable<InvoiceItem, 'id'>;
  refunds: EntityTable<Refund, 'id'>;
  sync_queue: EntityTable<SyncQueue, 'id'>;
};

// Schema declaration
db.version(1).stores({
  users: 'id, email, role, branch_id',
  branches: 'id, name, is_active',
  products: 'id, name, category, brand, sku',
  inventory: 'id, product_id, branch_id',
  invoices: 'id, branch_id, user_id, status, synced',
  invoice_items: 'id, invoice_id, product_id',
  refunds: 'id, invoice_id, synced',
  sync_queue: '++id, table_name, operation'
});

export type { db };
export default db;
