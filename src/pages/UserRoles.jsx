import { useState } from "react";
import { Shield, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ROLE_COLORS } from "@/lib/rolesConfig";
import { loadPermissions, savePermissions } from "@/lib/permissions";

// Every sidebar module mapped to the permission key that controls it.
// Grouped by sidebar section so the UI mirrors the nav exactly.
const SIDEBAR_MODULES = [
  {
    section: "CORE",
    modules: [
      { label: "Dashboard",      perm: "View orders" },   // always visible; "View orders" is the closest core perm
      { label: "POS / Billing",  perm: "POS billing" },
      { label: "Kitchen Display",perm: "Kitchen display" },
      { label: "Orders",         perm: "View orders" },
    ],
  },
  {
    section: "MENU & ITEMS",
    modules: [
      { label: "Menu",               perm: "Menu management" },
      { label: "Combos / Meal Deals",perm: "Menu management" },
      { label: "Offers & Discounts", perm: "Menu management" },
    ],
  },
  {
    section: "TABLES & GUESTS",
    modules: [
      { label: "Table Management", perm: "Manage branch" },
      { label: "Reservations",     perm: "Manage branch" },
    ],
  },
  {
    section: "ORDERING CHANNELS",
    modules: [
      { label: "Online Orders",    perm: "View orders" },
      { label: "QR Code Ordering", perm: "View orders" },
    ],
  },
  {
    section: "INVENTORY & SUPPLY",
    modules: [
      { label: "Inventory",       perm: "Manage inventory" },
      { label: "Vendors",         perm: "Vendor management" },
      { label: "Purchase Orders", perm: "Purchase orders" },
    ],
  },
  {
    section: "FINANCE",
    modules: [
      { label: "Reports & Analytics", perm: "View reports" },
      { label: "Branch Comparison",   perm: "View all branches" },
      { label: "Franchise Payments",  perm: "View finance" },
      { label: "Expenses",            perm: "View finance" },
      { label: "Cash Drawer",         perm: "POS billing" },
      { label: "Tax & Compliance",    perm: "View finance" },
      { label: "Refunds / Voids",     perm: "Approve refunds" },
    ],
  },
  {
    section: "MARKETING",
    modules: [
      { label: "Advertisements",       perm: "Ad creative" },
      { label: "Ad Creative Builder",  perm: "Ad creative" },
    ],
  },
  {
    section: "STAFF",
    modules: [
      { label: "Staff",               perm: "Manage staff" },
      { label: "Attendance & Shifts", perm: "Manage staff" },
    ],
  },
  {
    section: "ADMINISTRATION",
    modules: [
      { label: "Recycle Bin",      perm: "Delete data" },
      { label: "Multi-Branch",     perm: "Manage branches" },
      { label: "Subscriptions",    perm: "System config" },
      { label: "Receipt Settings", perm: "System config" },
      { label: "AI Expansion",     perm: "System config" },
      { label: "Audit Logs",       perm: "System config" },
      { label: "Integrations",     perm: "System config" },
      { label: "Data Export",      perm: "View reports" },
      { label: "User Management",  perm: "Manage users" },
      { label: "User Roles",       perm: "Manage users" },
      { label: "Settings",         perm: "System config" },
    ],
  },
];

// Derive the flat unique permission list from the module map
const ALL_PERMISSIONS_FROM_MODULES = [
  "All access",
  ...Array.from(new Set(SIDEBAR_MODULES.flatMap(g => g.modules.map(m => m.perm)))),
];

// Extra permissions that don't map 1-to-1 to a sidebar module
// but are still meaningful to show
const EXTRA_PERMISSIONS = [
  "Print receipts",
  "Basic reports",
  "Update order status",
  "View menu",
  "Stock alerts",
];

const ALL_PERMISSIONS = [
  ...ALL_PERMISSIONS_FROM_MODULES,
  ...EXTRA_PERMISSIONS.filter(p => !ALL_PERMISSIONS_FROM_MODULES.includes(p)),
];

// Default permission sets per role (used for Reset)
const ROLE_DEFAULT_PERMISSIONS = {
  "Super Admin": ALL_PERMISSIONS,
  "Franchise Owner": ["View all branches", "View reports", "Manage staff", "View finance",
    "Menu management", "View orders", "Manage branches", "Ad creative"],
  "Branch Manager": ["Manage branch", "View orders", "Manage staff", "View reports",
    "Approve refunds", "POS billing", "Print receipts", "Kitchen display",
    "Menu management", "Manage inventory", "Ad creative"],
  "Cashier": ["POS billing", "View orders", "Print receipts", "Basic reports", "Kitchen display"],
  "Kitchen Staff": ["Kitchen display", "Update order status", "View menu"],
  "Inventory Manager": ["Manage inventory", "Purchase orders", "Vendor management",
    "Stock alerts", "View reports"],
};

function getInitialPerms() {
  const stored = loadPermissions();
  if (stored) return stored;
  savePermissions(ROLE_DEFAULT_PERMISSIONS);
  return { ...ROLE_DEFAULT_PERMISSIONS };
}

export default function UserRoles() {
  const [perms, setPerms] = useState(getInitialPerms);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (role, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${role}__${section}`]: !prev[`${role}__${section}`],
    }));
  };

  const isSectionOpen = (role, section) => {
    const key = `${role}__${section}`;
    return key in expandedSections ? expandedSections[key] : true; // default open
  };

  // Check if a perm is active for a role
  const isActive = (role, perm) => (perms[role] || []).includes(perm);

  // Toggle a single permission
  const togglePerm = (role, perm) => {
    setPerms(prev => {
      const current = prev[role] || [];
      let updated;

      if (perm === "All access") {
        // All access toggles everything on or off
        const allOn = current.includes("All access");
        updated = allOn ? [] : [...ALL_PERMISSIONS];
      } else {
        updated = current.includes(perm)
          ? current.filter(p => p !== perm)
          : [...current, perm];
        // If all non-"All access" perms are now on, also enable "All access"
        const nonAllPerms = ALL_PERMISSIONS.filter(p => p !== "All access");
        if (nonAllPerms.every(p => updated.includes(p))) {
          updated = [...new Set([...updated, "All access"])];
        } else {
          updated = updated.filter(p => p !== "All access");
        }
      }

      const next = { ...prev, [role]: updated };
      savePermissions(next);
      return next;
    });
  };

  // Toggle all modules in a section at once
  const toggleSectionPerms = (role, section) => {
    const sectionPerms = [...new Set(section.modules.map(m => m.perm))];
    const allOn = sectionPerms.every(p => isActive(role, p));
    setPerms(prev => {
      const current = prev[role] || [];
      const updated = allOn
        ? current.filter(p => !sectionPerms.includes(p))
        : [...new Set([...current, ...sectionPerms])];
      const next = { ...prev, [role]: updated };
      savePermissions(next);
      return next;
    });
  };

  const resetRole = (role) => {
    setPerms(prev => {
      const next = { ...prev, [role]: [...(ROLE_DEFAULT_PERMISSIONS[role] || [])] };
      savePermissions(next);
      return next;
    });
    toast.success(`${role} reset to defaults.`);
  };

  const permCount = (role) => (perms[role] || []).filter(p => p !== "All access").length;
  const totalPerms = ALL_PERMISSIONS.filter(p => p !== "All access").length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">Changes are saved automatically</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.keys(perms).map((role) => {
          const allOn = isActive(role, "All access");
          return (
            <div key={role} className="glass rounded-2xl p-5 hover:glow-orange transition-all flex flex-col">

              {/* Role header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className={`w-4 h-4 ${ROLE_COLORS[role] || "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${ROLE_COLORS[role] || "text-foreground"}`}>{role}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {permCount(role)}/{totalPerms} permissions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => resetRole(role)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Reset
                </button>
              </div>

              {/* All access master toggle */}
              <div className={`flex items-center justify-between py-2 px-3 rounded-xl mb-3 border transition-colors ${
                allOn
                  ? "bg-primary/10 border-primary/20"
                  : "bg-white/5 border-white/10"
              }`}>
                <div>
                  <span className="text-xs font-semibold text-foreground">All access</span>
                  <p className="text-[10px] text-muted-foreground">Enable all modules at once</p>
                </div>
                <Switch checked={allOn} onCheckedChange={() => togglePerm(role, "All access")} />
              </div>

              {/* Sections */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-80 pr-1">
                {SIDEBAR_MODULES.map((group) => {
                  const uniquePerms = [...new Set(group.modules.map(m => m.perm))];
                  const sectionAllOn = uniquePerms.every(p => isActive(role, p));
                  const sectionSomeOn = uniquePerms.some(p => isActive(role, p));
                  const open = isSectionOpen(role, group.section);

                  return (
                    <div key={group.section} className="rounded-xl overflow-hidden border border-white/5">
                      {/* Section header row */}
                      <div className="flex items-center justify-between px-3 py-2 bg-white/3 hover:bg-white/5 transition-colors">
                        <button
                          className="flex items-center gap-1.5 flex-1 text-left"
                          onClick={() => toggleSection(role, group.section)}
                        >
                          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
                          <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">
                            {group.section}
                          </span>
                          {sectionSomeOn && !sectionAllOn && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-1">partial</span>
                          )}
                        </button>
                        {/* Section-level toggle */}
                        <Switch
                          checked={sectionAllOn}
                          onCheckedChange={() => toggleSectionPerms(role, group)}
                        />
                      </div>

                      {/* Module rows */}
                      {open && (
                        <div className="divide-y divide-white/5">
                          {group.modules.map((mod, i) => {
                            const active = isActive(role, mod.perm);
                            return (
                              <div
                                key={`${mod.label}-${i}`}
                                className={`flex items-center justify-between py-1.5 px-3 transition-colors ${
                                  active ? "bg-primary/5" : "opacity-50"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs text-foreground">{mod.label}</span>
                                  <span className="text-[9px] text-muted-foreground">
                                    requires: {mod.perm}
                                  </span>
                                </div>
                                <Switch
                                  checked={active}
                                  onCheckedChange={() => togglePerm(role, mod.perm)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Extra standalone permissions */}
                <div className="rounded-xl overflow-hidden border border-white/5">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-white/3">
                    <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">OTHER</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {EXTRA_PERMISSIONS.map((perm) => {
                      const active = isActive(role, perm);
                      return (
                        <div
                          key={perm}
                          className={`flex items-center justify-between py-1.5 px-3 transition-colors ${
                            active ? "bg-primary/5" : "opacity-50"
                          }`}
                        >
                          <span className="text-xs text-foreground">{perm}</span>
                          <Switch
                            checked={active}
                            onCheckedChange={() => togglePerm(role, perm)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}