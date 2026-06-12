import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getSession, clearSession } from "@/lib/restaurantAuth";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, ChefHat, ClipboardList,
  UtensilsCrossed, Gift, Tag, TableIcon, CalendarCheck,
  Globe, QrCode, Package,
  Building2, ShoppingBag, BarChart3, Wallet,
  CreditCard, FileText, RefreshCw, Users, Clock,
  Store, FileSearch, Plug, Download, UserCog, Shield,
  Settings, LogOut, ChevronDown, Megaphone, DollarSign,
  GitCompare, Receipt, Sparkles, Layers, Trash2
} from "lucide-react";

const NAV = [
  { section: "CORE", items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "POS / Billing", icon: ShoppingCart, path: "/pos" },
    { label: "Kitchen Display", icon: ChefHat, path: "/kitchen" },
    { label: "Orders", icon: ClipboardList, path: "/orders" },
  ]},
  { section: "MENU & ITEMS", items: [
    { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
    { label: "Combos / Meal Deals", icon: Gift, path: "/combos" },
    { label: "Offers & Discounts", icon: Tag, path: "/offers" },
  ]},
  { section: "TABLES & GUESTS", items: [
    { label: "Table Management", icon: TableIcon, path: "/tables" },
    { label: "Reservations", icon: CalendarCheck, path: "/reservations" },
  ]},
  { section: "ORDERING CHANNELS", items: [
    { label: "Online Orders", icon: Globe, path: "/online-orders" },
    { label: "QR Code Ordering", icon: QrCode, path: "/qr-ordering" },
  ]},
  { section: "INVENTORY & SUPPLY", items: [
    { label: "Inventory", icon: Package, path: "/inventory" },
    { label: "Vendors", icon: Building2, path: "/vendors" },
    { label: "Purchase Orders", icon: ShoppingBag, path: "/purchase-orders" },
  ]},
  { section: "FINANCE", items: [
    { label: "Reports & Analytics", icon: BarChart3, path: "/reports" },
    { label: "Branch Comparison", icon: GitCompare, path: "/branch-comparison" },
    { label: "Franchise Payments", icon: DollarSign, path: "/franchise-payments" },
    { label: "Expenses", icon: Wallet, path: "/expenses" },
    { label: "Cash Drawer", icon: CreditCard, path: "/cash-drawer" },
    { label: "Tax & Compliance", icon: FileText, path: "/tax" },
    { label: "Refunds / Voids", icon: RefreshCw, path: "/refunds" },
  ]},
  { section: "MARKETING", items: [
    { label: "Advertisements", icon: Megaphone, path: "/advertisements" },
  ]},
  { section: "STAFF", items: [
    { label: "Staff", icon: Users, path: "/staff" },
    { label: "Attendance & Shifts", icon: Clock, path: "/attendance" },
  ]},
  { section: "ADMINISTRATION", items: [
    { label: "Recycle Bin", icon: Trash2, path: "/recycle-bin" },
    { label: "Multi-Branch", icon: Store, path: "/branches" },
    { label: "Subscriptions", icon: Layers, path: "/subscriptions" },
    { label: "Receipt Settings", icon: Receipt, path: "/receipt-settings" },
    { label: "AI Expansion", icon: Sparkles, path: "/ai-expansion" },
    { label: "Audit Logs", icon: FileSearch, path: "/audit-logs" },
    { label: "Integrations", icon: Plug, path: "/integrations" },
    { label: "Data Export", icon: Download, path: "/data-export" },
    { label: "User Management", icon: UserCog, path: "/users" },
    { label: "User Roles", icon: Shield, path: "/user-roles" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ]},
];

const ROLE_ACCESS = {
  staff: new Set(["/", "/orders", "/kitchen", "/attendance"]),
  cashier: new Set(["/", "/pos", "/orders", "/kitchen", "/cash-drawer", "/refunds"]),
  manager: new Set(["/", "/pos", "/orders", "/kitchen", "/menu", "/tables", "/reservations", "/online-orders", "/qr-ordering", "/inventory", "/vendors", "/purchase-orders", "/reports", "/branch-comparison", "/expenses", "/cash-drawer", "/tax", "/refunds", "/advertisements", "/staff", "/attendance", "/recycle-bin"]),
};

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState({});
  const [brandName, setBrandName] = useState(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem("churi_settings") || "{}");
      return savedSettings.restaurant_name || "Churi House";
    } catch {
      return "Churi House";
    }
  });
  const session = getSession();

  const toggle = (section) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));

  const isFullAccess = !session || session.role === "super_admin" || session.role === "admin";
  const allowedPaths = !isFullAccess ? ROLE_ACCESS[session?.role] : null;
  const filterItem = (item) => isFullAccess || allowedPaths?.has(item.path) || false;

  useEffect(() => {
    const syncBrandName = () => {
      try {
        const savedSettings = JSON.parse(localStorage.getItem("churi_settings") || "{}");
        setBrandName(savedSettings.restaurant_name || "Churi House");
      } catch {
        setBrandName("Churi House");
      }
    };

    syncBrandName();
    window.addEventListener("branding-updated", syncBrandName);
    window.addEventListener("storage", syncBrandName);

    return () => {
      window.removeEventListener("branding-updated", syncBrandName);
      window.removeEventListener("storage", syncBrandName);
    };
  }, []);

  const brandLogo = localStorage.getItem("branding_logo");

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50 overflow-hidden">
      {/* Brand */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        {brandLogo
          ? <img src={brandLogo} alt="Logo" className="w-9 h-9 rounded-xl object-cover shrink-0" />
          : <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-orange shrink-0"><span className="text-xs font-bold text-primary">CH</span></div>
        }
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground leading-tight truncate">{brandName}</h1>
          <p className="text-[9px] text-primary uppercase tracking-wider font-medium">POS System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <button
              onClick={() => toggle(section)}
              className="flex items-center justify-between w-full px-4 py-1.5 group"
            >
              <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest">{section}</span>
              <ChevronDown className={`w-3 h-3 text-primary/50 transition-transform ${collapsed[section] ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed[section] && (
              <div className="px-2 space-y-0.5">
                {items.filter(filterItem).map((item) => {
                  const itemPath = item.path.split("?")[0];
                  const itemSearch = item.path.includes("?") ? "?" + item.path.split("?")[1] : "";
                  const active = itemSearch
                    ? location.pathname === itemPath && location.search === itemSearch
                    : location.pathname === itemPath && !location.search;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="w-[15px] h-[15px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {session && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-foreground truncate">{session.full_name || session.username}</p>
            <p className="text-[10px] text-primary capitalize">{session.role?.replace(/_/g," ")} &middot; {session.franchise}</p>
          </div>
        )}
        <button
          onClick={() => {
  clearSession();
  localStorage.removeItem("local_AppUser");
  window.location.href = "/";
}}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all"
        >
          <LogOut className="w-[15px] h-[15px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}