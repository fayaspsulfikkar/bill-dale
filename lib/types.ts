export interface User {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  branch_id?: string;
}

export interface Business {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  branch_code?: string;
  address: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive" | "temporarily_closed" | "under_maintenance" | "archived";
  opening_date?: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category: string;
  brand: string;
  size: string;
  color?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  gst_percent: number;
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
  phone: string;
  name: string;
  email?: string;
  total_spent?: number;
  total_visits?: number;
  last_visit?: string;
  preferences?: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: "cash" | "card" | "upi" | "split";
  payment_status: "paid" | "partial" | "pending";
  created_at: string;
  cashier_id: string;
  cashier_name?: string;
  status: "completed" | "refunded" | "void";
  notes?: string;
  split_payments?: { method: string; amount: number }[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  gst_percent: number;
  gst_amount: number;
  total_price: number;
}
