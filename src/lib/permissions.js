import { getSession } from "@/lib/restaurantAuth";

const STORAGE_KEY = "role_permissions";

// Maps permission names → which nav paths they unlock
export const PERMISSION_PATHS = {
  "All access":         null, // null = everything
  "System config":      ["/settings", "/receipt-settings", "/integrations"],
  "Delete data":        ["/recycle-bin"],
  "Manage users":       ["/users", "/user-roles"],
  "View reports":       ["/reports", "/branch-comparison", "/tax", "/data-export"],
  "Manage branches":    ["/branches"],
  "View all branches":  ["/branch-comparison", "/branches"],
  "View finance":       ["/reports", "/franchise-payments", "/expenses", "/cash-drawer", "/tax"],
  "Menu management":    ["/menu", "/combos", "/offers"],
  "Manage branch":      ["/settings", "/receipt-settings"],
  "View orders":        ["/orders", "/kitchen", "/"],
  "Manage staff":       ["/staff", "/attendance"],
  "Approve refunds":    ["/refunds"],
  "POS billing":        ["/pos"],
  "Print receipts":     ["/pos"],
  "Basic reports":      ["/reports"],
  "Kitchen display":    ["/kitchen"],
  "Update order status":["/kitchen", "/orders"],
  "View menu":          ["/menu"],
  "Manage inventory":   ["/inventory", "/vendors", "/purchase-orders"],
  "Purchase orders":    ["/purchase-orders"],
  "Vendor management":  ["/vendors"],
  "Stock alerts":       ["/inventory"],
};

export function loadPermissions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function savePermissions(perms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

// Returns the Set of allowed paths for the current session's role
export function getAllowedPaths() {
  const session = getSession();
  if (!session) return new Set(["/"]);

  const role = session.role;

  // These roles always get everything regardless of toggles
  if (["super_admin", "admin", "Super Admin"].includes(role)) return null; // null = all access

  const allPerms = loadPermissions();
  const rolePerms = allPerms?.[role];

  if (!rolePerms) return new Set(["/"]);

  // "All access" toggle overrides everything
  if (rolePerms.includes("All access")) return null;

  // Build allowed path set from enabled permissions
  const paths = new Set(["/"]);
  rolePerms.forEach(perm => {
    const mapped = PERMISSION_PATHS[perm];
    if (mapped) mapped.forEach(p => paths.add(p));
  });

  return paths;
}

// Check if current user has a specific permission
export function hasPermission(permName) {
  const session = getSession();
  if (!session) return false;
  if (["super_admin", "admin", "Super Admin"].includes(session.role)) return true;

  const allPerms = loadPermissions();
  const rolePerms = allPerms?.[session.role] || [];
  return rolePerms.includes("All access") || rolePerms.includes(permName);
}