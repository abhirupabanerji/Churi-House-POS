export const ROLES = [
  "Super Admin",
  "Franchise Owner",
  "Branch Manager",
  "Cashier",
  "Kitchen Staff",
  "Inventory Manager",
];

export const ALL_PERMISSIONS = [
  "All access", "System config", "Delete data", "Manage users", "View reports",
  "Manage branches", "View all branches", "View finance", "Menu management",
  "Manage branch", "View orders", "Manage staff", "Approve refunds",
  "POS billing", "Print receipts", "Basic reports", "Kitchen display",
  "Update order status", "View menu", "Manage inventory",
  "Purchase orders", "Vendor management", "Stock alerts",
];

export const ROLE_DEFAULT_PERMISSIONS = {
  "Super Admin": [...ALL_PERMISSIONS],
  "Franchise Owner": ["View all branches", "View reports", "Manage staff", "View finance", "Menu management", "View orders", "Manage branches"],
  "Branch Manager": ["Manage branch", "View orders", "Manage staff", "View reports", "Approve refunds", "POS billing", "Print receipts"],
  "Cashier": ["POS billing", "View orders", "Print receipts", "Basic reports"],
  "Kitchen Staff": ["Kitchen display", "Update order status", "View menu"],
  "Inventory Manager": ["Manage inventory", "Purchase orders", "Vendor management", "Stock alerts", "View reports"],
};

export const ROLE_COLORS = {
  "Super Admin": "text-red-400",
  "Franchise Owner": "text-primary",
  "Branch Manager": "text-purple-400",
  "Cashier": "text-green-400",
  "Kitchen Staff": "text-yellow-400",
  "Inventory Manager": "text-blue-400",
};

const STORAGE_KEY = "role_permissions";

export function loadPermissions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...ROLE_DEFAULT_PERMISSIONS };
  } catch {
    return { ...ROLE_DEFAULT_PERMISSIONS };
  }
}

export function savePermissions(perms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}