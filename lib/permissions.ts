/**
 * Centralized permissions utility.
 * 
 * Granular role system:
 *   - 'owner'           → Full unrestricted access (business creator)
 *   - 'manager'         → Near-full access, cannot change ownership
 *   - 'cashier'         → POS billing, basic returns, cash register
 *   - 'inventory_staff' → Inventory management focus
 *   - 'accountant'      → Reports and financial data access
 *   - 'custom'          → Fully customizable permissions
 *   - 'admin'           → Legacy alias for 'owner' (backward compat)
 *   - 'staff'           → Legacy alias for 'cashier' (backward compat)
 */

export type UserRole =
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'inventory_staff'
  | 'accountant'
  | 'custom'
  | 'admin'   // legacy — treated as owner
  | 'staff';  // legacy — treated as cashier

export const ALL_ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'owner', label: 'Owner', description: 'Full unrestricted access to the entire system' },
  { id: 'manager', label: 'Manager', description: 'Near-full access — can manage staff, inventory, and billing' },
  { id: 'cashier', label: 'Cashier', description: 'POS billing, basic returns, and cash register' },
  { id: 'inventory_staff', label: 'Inventory Staff', description: 'Inventory and stock management focus' },
  { id: 'accountant', label: 'Accountant', description: 'Reports, tax data, and financial information' },
  { id: 'custom', label: 'Custom Role', description: 'Fully customizable permissions' },
];

export type POSAction =
  | 'create_bill'
  | 'hold_bill'
  | 'edit_active_bill'
  | 'cancel_bill'
  | 'delete_completed_bill'
  | 'reprint_receipt'
  | 'apply_manual_discount'
  | 'approve_discount_above_limit'
  | 'process_refund'
  | 'open_cash_drawer'
  | 'view_inventory'
  | 'add_products'
  | 'edit_product_details'
  | 'change_selling_price'
  | 'change_purchase_price'
  | 'adjust_stock_manually'
  | 'delete_products'
  | 'import_products'
  | 'view_daily_sales'
  | 'view_profit_margin'
  | 'view_staff_performance'
  | 'view_branch_reports'
  | 'export_reports'
  | 'view_tax_reports'
  | 'access_settings'
  | 'manage_receipts'
  | 'manage_devices'
  | 'manage_branches'
  | 'manage_staff_users'
  | 'manage_payment_methods'
  | 'change_security_settings'
  // Legacy actions (mapped from old system)
  | 'price_override'
  | 'high_discount'
  | 'credit_sale'
  | 'restricted_return'
  | 'delete_held_order'
  | 'reprint_invoice'
  | 'view_analytics'
  | 'open_cash_register'
  | 'close_cash_register'
  | 'edit_opening_balance'
  | 'quick_add_item'
  | 'redeem_loyalty'
  | 'apply_coupon'
  | 'view_all_branches'
  | 'inventory_adjustment';

/** Permission groups for the UI */
export const PERMISSION_GROUPS: { group: string; actions: { action: POSAction; label: string }[] }[] = [
  {
    group: 'Billing',
    actions: [
      { action: 'create_bill', label: 'Create bill' },
      { action: 'hold_bill', label: 'Hold bill' },
      { action: 'edit_active_bill', label: 'Edit active bill' },
      { action: 'cancel_bill', label: 'Cancel bill' },
      { action: 'delete_completed_bill', label: 'Delete completed bill' },
      { action: 'reprint_receipt', label: 'Reprint receipt' },
      { action: 'apply_manual_discount', label: 'Apply manual discount' },
      { action: 'approve_discount_above_limit', label: 'Approve discount above limit' },
      { action: 'process_refund', label: 'Process refund' },
      { action: 'open_cash_drawer', label: 'Open cash drawer' },
    ],
  },
  {
    group: 'Inventory',
    actions: [
      { action: 'view_inventory', label: 'View inventory' },
      { action: 'add_products', label: 'Add products' },
      { action: 'edit_product_details', label: 'Edit product details' },
      { action: 'change_selling_price', label: 'Change selling price' },
      { action: 'change_purchase_price', label: 'Change purchase price' },
      { action: 'adjust_stock_manually', label: 'Adjust stock manually' },
      { action: 'delete_products', label: 'Delete products' },
      { action: 'import_products', label: 'Import products' },
    ],
  },
  {
    group: 'Reports & Analytics',
    actions: [
      { action: 'view_daily_sales', label: 'View daily sales' },
      { action: 'view_profit_margin', label: 'View profit and margin' },
      { action: 'view_staff_performance', label: 'View staff performance' },
      { action: 'view_branch_reports', label: 'View branch reports' },
      { action: 'export_reports', label: 'Export reports' },
      { action: 'view_tax_reports', label: 'View tax reports' },
    ],
  },
  {
    group: 'Settings',
    actions: [
      { action: 'access_settings', label: 'Access settings' },
      { action: 'manage_receipts', label: 'Manage receipts' },
      { action: 'manage_devices', label: 'Manage devices' },
      { action: 'manage_branches', label: 'Manage branches' },
      { action: 'manage_staff_users', label: 'Manage staff users' },
      { action: 'manage_payment_methods', label: 'Manage payment methods' },
      { action: 'change_security_settings', label: 'Change security settings' },
    ],
  },
];

/** All permission action keys as a flat list */
export const ALL_ACTIONS: POSAction[] = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.action));

/** Default permission presets per role */
export const ROLE_PRESETS: Record<string, Set<POSAction>> = {
  owner: new Set(ALL_ACTIONS),
  admin: new Set(ALL_ACTIONS), // legacy alias

  manager: new Set([
    'create_bill', 'hold_bill', 'edit_active_bill', 'cancel_bill', 'delete_completed_bill',
    'reprint_receipt', 'apply_manual_discount', 'approve_discount_above_limit', 'process_refund', 'open_cash_drawer',
    'view_inventory', 'add_products', 'edit_product_details', 'change_selling_price', 'change_purchase_price',
    'adjust_stock_manually', 'delete_products', 'import_products',
    'view_daily_sales', 'view_profit_margin', 'view_staff_performance', 'view_branch_reports', 'export_reports', 'view_tax_reports',
    'access_settings', 'manage_receipts', 'manage_devices', 'manage_branches', 'manage_staff_users', 'manage_payment_methods',
    // Legacy
    'price_override', 'high_discount', 'credit_sale', 'restricted_return', 'delete_held_order',
    'reprint_invoice', 'view_analytics', 'open_cash_register', 'close_cash_register',
    'edit_opening_balance', 'quick_add_item', 'redeem_loyalty', 'apply_coupon', 'view_all_branches', 'inventory_adjustment',
  ]),

  cashier: new Set([
    'create_bill', 'hold_bill', 'edit_active_bill', 'cancel_bill',
    'reprint_receipt', 'apply_manual_discount', 'process_refund', 'open_cash_drawer',
    'view_inventory',
    'view_daily_sales',
    // Legacy
    'price_override', 'restricted_return', 'open_cash_register', 'close_cash_register',
    'redeem_loyalty', 'apply_coupon',
  ]),
  staff: new Set([ // legacy alias for cashier
    'create_bill', 'hold_bill', 'edit_active_bill', 'cancel_bill',
    'reprint_receipt', 'apply_manual_discount', 'process_refund', 'open_cash_drawer',
    'view_inventory',
    'view_daily_sales',
    'price_override', 'restricted_return', 'open_cash_register', 'close_cash_register',
    'redeem_loyalty', 'apply_coupon',
  ]),

  inventory_staff: new Set([
    'view_inventory', 'add_products', 'edit_product_details', 'change_selling_price', 'change_purchase_price',
    'adjust_stock_manually', 'import_products',
    'view_daily_sales', 'view_branch_reports',
    // Legacy
    'inventory_adjustment',
  ]),

  accountant: new Set([
    'view_inventory',
    'view_daily_sales', 'view_profit_margin', 'view_staff_performance', 'view_branch_reports', 'export_reports', 'view_tax_reports',
    // Legacy
    'view_analytics', 'view_all_branches',
  ]),

  custom: new Set<POSAction>(), // empty — fully user-defined
};

/**
 * Normalizes legacy roles to the new system.
 */
export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'cashier';
  if (role === 'admin') return 'owner';
  if (role === 'staff') return 'cashier';
  return role as UserRole;
}

/**
 * Returns true if the role has admin-level access (owner or manager).
 */
export function isAdminLevel(role: UserRole | string | null | undefined): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'admin' || role === 'manager';
}

/**
 * Returns true if the given role is allowed to perform the action.
 * Uses the role preset as a baseline, then checks custom permissions array.
 */
export function canDo(role: UserRole | null | undefined, action: POSAction, customPermissions?: string[]): boolean {
  if (!role) return false;
  // Owner/admin can do everything
  if (role === 'owner' || role === 'admin') return true;
  // Check role preset first
  const preset = ROLE_PRESETS[role];
  if (preset?.has(action)) return true;
  // Check custom permissions array
  if (customPermissions?.includes(action)) return true;
  return false;
}

/**
 * Returns true if the action requires manager/admin approval when a non-admin role attempts it.
 */
export function requiresApproval(role: UserRole | null | undefined, action: POSAction, customPermissions?: string[]): boolean {
  if (!role) return true;
  if (isAdminLevel(role)) return false;
  return !canDo(role, action, customPermissions);
}

/**
 * Human-readable label for each action (used in approval dialogs).
 */
export const ACTION_LABELS: Record<string, string> = {
  // New granular actions
  create_bill: 'Create Bill',
  hold_bill: 'Hold Bill',
  edit_active_bill: 'Edit Active Bill',
  cancel_bill: 'Cancel Bill',
  delete_completed_bill: 'Delete Completed Bill',
  reprint_receipt: 'Reprint Receipt',
  apply_manual_discount: 'Apply Manual Discount',
  approve_discount_above_limit: 'Approve Discount Above Limit',
  process_refund: 'Process Refund',
  open_cash_drawer: 'Open Cash Drawer',
  view_inventory: 'View Inventory',
  add_products: 'Add Products',
  edit_product_details: 'Edit Product Details',
  change_selling_price: 'Change Selling Price',
  change_purchase_price: 'Change Purchase Price',
  adjust_stock_manually: 'Adjust Stock Manually',
  delete_products: 'Delete Products',
  import_products: 'Import Products',
  view_daily_sales: 'View Daily Sales',
  view_profit_margin: 'View Profit & Margin',
  view_staff_performance: 'View Staff Performance',
  view_branch_reports: 'View Branch Reports',
  export_reports: 'Export Reports',
  view_tax_reports: 'View Tax Reports',
  access_settings: 'Access Settings',
  manage_receipts: 'Manage Receipts',
  manage_devices: 'Manage Devices',
  manage_branches: 'Manage Branches',
  manage_staff_users: 'Manage Staff Users',
  manage_payment_methods: 'Manage Payment Methods',
  change_security_settings: 'Change Security Settings',
  // Legacy labels
  price_override: 'Price Override',
  high_discount: 'High Discount (>20%)',
  credit_sale: 'Credit Sale',
  restricted_return: 'Process Return',
  delete_held_order: 'Delete Held Order',
  reprint_invoice: 'Reprint Invoice',
  view_analytics: 'View Analytics',
  open_cash_register: 'Open Cash Register',
  close_cash_register: 'Close Cash Register',
  edit_opening_balance: 'Edit Opening Balance',
  quick_add_item: 'Quick Add Item',
  redeem_loyalty: 'Redeem Loyalty Points',
  apply_coupon: 'Apply Coupon',
  view_all_branches: 'View All Branches',
  inventory_adjustment: 'Inventory Adjustment',
};
