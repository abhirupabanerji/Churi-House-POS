import { useState } from "react";
import { Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const ALL_PERMISSIONS = [
  "All access", "System config", "Delete data", "Manage users", "View reports",
  "Manage branches", "View all branches", "View finance", "Menu management",
  "Manage branch", "View orders", "Manage staff", "Approve refunds",
  "POS billing", "Print receipts", "Basic reports", "Kitchen display",
  "Update order status", "View menu", "Manage inventory",
  "Purchase orders", "Vendor management", "Stock alerts",
];

const ROLE_DEFAULT_PERMISSIONS = {
  "Super Admin": ["All access", "System config", "Delete data", "Manage users", "View reports", "Manage branches", "View all branches", "View finance", "Menu management", "Manage branch", "View orders", "Manage staff", "Approve refunds", "POS billing", "Print receipts", "Basic reports", "Kitchen display", "Update order status", "View menu", "Manage inventory", "Purchase orders", "Vendor management", "Stock alerts"],
  "Franchise Owner": ["View all branches", "View reports", "Manage staff", "View finance", "Menu management", "View orders", "Manage branches"],
  "Branch Manager": ["Manage branch", "View orders", "Manage staff", "View reports", "Approve refunds", "POS billing", "Print receipts"],
  "Cashier": ["POS billing", "View orders", "Print receipts", "Basic reports"],
  "Kitchen Staff": ["Kitchen display", "Update order status", "View menu"],
  "Inventory Manager": ["Manage inventory", "Purchase orders", "Vendor management", "Stock alerts", "View reports"],
};

const COLORS = {
  "Super Admin": "text-red-400",
  "Franchise Owner": "text-primary",
  "Branch Manager": "text-purple-400",
  "Cashier": "text-green-400",
  "Kitchen Staff": "text-yellow-400",
  "Inventory Manager": "text-blue-400",
};

export default function UserRoles() {
  const [perms, setPerms] = useState(ROLE_DEFAULT_PERMISSIONS);

  const toggle = (role, perm) => {
    setPerms(prev => {
      const current = prev[role] || [];
      const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
      return { ...prev, [role]: updated };
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-foreground">User Roles &amp; Permissions</h1><p className="text-sm text-muted-foreground">Toggle permissions dynamically per role</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.keys(ROLE_DEFAULT_PERMISSIONS).map((role) => (
          <div key={role} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className={`w-4 h-4 ${COLORS[role]}`} /></div>
              <div>
                <h3 className={`text-sm font-bold ${COLORS[role]}`}>{role}</h3>
                <p className="text-[10px] text-muted-foreground">{(perms[role] || []).length}/{ALL_PERMISSIONS.length} permissions</p>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((p) => {
                const active = (perms[role] || []).includes(p);
                return (
                  <div key={p} className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${active ? "bg-primary/5" : "opacity-50"}`}>
                    <span className="text-xs text-foreground">{p}</span>
                    <Switch checked={active} onCheckedChange={() => toggle(role, p)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}