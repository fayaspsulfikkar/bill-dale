// Security tab default values and constants

export const DEFAULT_SECURITY = {
  pin_length: 4 as 4 | 6,
  auto_lock_enabled: true,
  auto_lock_minutes: 5,
  lock_on_minimize: false,
  lock_after_sale: false,
  require_pin_unlock: true,
  show_lock_countdown: true,
  failed_attempts_limit: 5,
  cooldown_minutes: 5,
  notify_admin_failed: true,
  require_admin_unlock: false,
  require_pin_on_open: false,
  require_admin_new_device: false,
  allow_trusted_devices_only: false,
  staff_branch_only: true,
  admin_pin_switch_branch: true,
  prevent_unlink_branch: true,
  restrict_inventory_branch: true,
  restrict_reports_branch: false,
  mask_customer_phone: false,
  hide_credit_balance: false,
  hide_profit_non_admin: true,
  admin_pin_export_data: true,
  admin_pin_clear_data: true,
  admin_pin_restore_backup: true,
  log_data_exports: true,
  admin_pin_critical_settings: true,
  admin_pin_manage_staff: true,
  admin_pin_tax_settings: true,
  admin_pin_unlink_branch: true,
  discount_pin_threshold: 20,
  pin_required_actions: [
    'process_refund',
    'delete_completed_bill',
    'cancel_bill',
    'adjust_stock_manually',
    'change_selling_price',
    'open_cash_drawer',
    'export_reports',
    'change_security_settings',
  ] as string[],
};

export const PIN_ACTIONS = [
  { key: 'process_refund', label: 'Refunds' },
  { key: 'delete_completed_bill', label: 'Delete bills' },
  { key: 'cancel_bill', label: 'Cancel bills' },
  { key: 'approve_discount_above_limit', label: 'Discounts above threshold' },
  { key: 'edit_completed_sale', label: 'Edit completed sale' },
  { key: 'change_selling_price', label: 'Change product price' },
  { key: 'adjust_stock_manually', label: 'Manual stock adjustment' },
  { key: 'open_cash_drawer', label: 'Open cash drawer' },
  { key: 'view_profit_margin', label: 'View profit reports' },
  { key: 'export_reports', label: 'Export reports' },
  { key: 'change_gst_settings', label: 'Change GST/tax settings' },
  { key: 'change_payment_methods', label: 'Change payment methods' },
  { key: 'switch_branch', label: 'Switch branch' },
  { key: 'clear_local_data', label: 'Clear local data' },
  { key: 'force_sync', label: 'Force sync data' },
];

export const LOCK_TIMEOUTS = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

export const FAILED_ATTEMPT_OPTIONS = [
  { label: '3 attempts', value: 3 },
  { label: '5 attempts', value: 5 },
  { label: '10 attempts', value: 10 },
];

export const COOLDOWN_OPTIONS = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

export const SAMPLE_LOGS = [
  { time: '2026-05-22 10:32', user: 'Admin', branch: 'Bathery', device: 'Front Counter', action: 'Security settings updated', details: 'Auto-lock enabled' },
  { time: '2026-05-22 09:15', user: 'Rajan', branch: 'Bathery', device: 'Front Counter', action: 'Failed PIN attempt (3x)', details: 'Staff Mode PIN' },
  { time: '2026-05-21 18:45', user: 'Admin', branch: 'Bathery', device: 'Manager Laptop', action: 'Refund approved', details: 'INV-0042 — ₹1,200' },
  { time: '2026-05-21 16:20', user: 'Priya', branch: 'Kalpetta', device: 'POS Tablet', action: 'Completed bill deleted', details: 'INV-0038' },
  { time: '2026-05-21 14:10', user: 'Admin', branch: 'Bathery', device: 'Manager Laptop', action: 'Product price changed', details: 'Air Jordan 1 — ₹12,999→₹11,499' },
  { time: '2026-05-20 11:05', user: 'System', branch: '—', device: '—', action: 'Report exported', details: 'Daily sales CSV' },
];

export const SAMPLE_DEVICES = [
  { name: 'Front Counter Terminal', branch: 'Bathery', lastActive: '2 min ago', status: 'active' as const },
  { name: 'Manager Laptop', branch: 'Bathery', lastActive: '15 min ago', status: 'active' as const },
  { name: 'Backup Tablet', branch: 'Kalpetta', lastActive: '3 days ago', status: 'inactive' as const },
];
