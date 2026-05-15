/**
 * Centralized permissions utility.
 * 
 * Role mapping (binary system):
 *   - 'admin'  → Manager + Admin level (full access)
 *   - 'staff'  → Cashier + Staff level (restricted access)
 * 
 * Actions and who can perform them:
 */

export type UserRole = 'admin' | 'staff';

export type POSAction =
  | 'price_override'       // Override unit price of a cart item
  | 'high_discount'        // Apply discount beyond the staff limit (>20%)
  | 'credit_sale'          // Allow sale without immediate payment
  | 'restricted_return'    // Process returns (all staff can do basic returns)
  | 'delete_held_order'    // Delete a held order (not just resume)
  | 'reprint_invoice'      // Reprint old invoices
  | 'view_analytics'       // Access analytics pages
  | 'access_settings'      // Access settings pages
  | 'open_cash_register'   // Open the daily cash register
  | 'close_cash_register'  // Close the daily cash register
  | 'edit_opening_balance' // Edit opening balance after register is open
  | 'quick_add_item'       // Add custom/unregistered items to cart
  | 'redeem_loyalty'       // Redeem loyalty points for a customer
  | 'apply_coupon'         // Apply coupon codes
  | 'view_all_branches'    // View orders/inventory from other branches
  | 'inventory_adjustment';// Manually adjust stock

const ADMIN_ONLY_ACTIONS: Set<POSAction> = new Set([
  'high_discount',
  'credit_sale',
  'delete_held_order',
  'reprint_invoice',
  'view_analytics',
  'access_settings',
  'edit_opening_balance',
  'quick_add_item',
  'view_all_branches',
  'inventory_adjustment',
]);

const STAFF_CAN_DO: Set<POSAction> = new Set([
  'price_override',
  'restricted_return',
  'open_cash_register',
  'close_cash_register',
  'redeem_loyalty',
  'apply_coupon',
]);

/**
 * Returns true if the given role is allowed to perform the action.
 */
export function canDo(role: UserRole | null | undefined, action: POSAction): boolean {
  if (!role) return false;
  if (role === 'admin') return true; // admin can do everything
  return STAFF_CAN_DO.has(action);
}

/**
 * Returns true if the action requires manager/admin approval when a staff member attempts it.
 */
export function requiresApproval(role: UserRole | null | undefined, action: POSAction): boolean {
  if (!role) return true;
  if (role === 'admin') return false;
  return ADMIN_ONLY_ACTIONS.has(action);
}

/**
 * Human-readable label for each action (used in approval dialogs).
 */
export const ACTION_LABELS: Record<POSAction, string> = {
  price_override: 'Price Override',
  high_discount: 'High Discount (>20%)',
  credit_sale: 'Credit Sale',
  restricted_return: 'Process Return',
  delete_held_order: 'Delete Held Order',
  reprint_invoice: 'Reprint Invoice',
  view_analytics: 'View Analytics',
  access_settings: 'Access Settings',
  open_cash_register: 'Open Cash Register',
  close_cash_register: 'Close Cash Register',
  edit_opening_balance: 'Edit Opening Balance',
  quick_add_item: 'Quick Add Item',
  redeem_loyalty: 'Redeem Loyalty Points',
  apply_coupon: 'Apply Coupon',
  view_all_branches: 'View All Branches',
  inventory_adjustment: 'Inventory Adjustment',
};
