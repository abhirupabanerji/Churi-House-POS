import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, ArrowLeft, Loader2, X, Printer, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import ReceiptPreview from "@/components/ReceiptPreview";
import { logAudit } from "@/lib/auditLog";
import { fieldError, phoneNumber } from "@/lib/formValidation";

const LS_CAT_KEY = "menu_custom_categories";
const DEFAULT_CATEGORIES = ["Starters", "Main Course", "Biryani", "Breads", "Desserts", "Beverages"];

function loadCustomCategories() {
  try { return JSON.parse(localStorage.getItem(LS_CAT_KEY) || "[]"); } catch { return []; }
}

function getCurrentUser() {
  try {
    const keys = ["local_AppUser", "AppUser", "ch_AppUser", "user", "currentUser"];
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort((a, b) => new Date(b.last_login || 0) - new Date(a.last_login || 0));
          const user = sorted[0];
          if (user && (user.full_name || user.username || user.email)) return user;
        } else {
          if (parsed && (parsed.full_name || parsed.username || parsed.email)) return parsed;
        }
      }
    }
    return {};
  } catch { return {}; }
}

const COUNTRY_CODES = [
  { code: "+91",  country: "IN", name: "India" },
  { code: "+1",   country: "US", name: "United States" },
  { code: "+44",  country: "GB", name: "United Kingdom" },
  { code: "+971", country: "AE", name: "UAE" },
  { code: "+966", country: "SA", name: "Saudi Arabia" },
  { code: "+65",  country: "SG", name: "Singapore" },
  { code: "+61",  country: "AU", name: "Australia" },
  { code: "+1",   country: "CA", name: "Canada" },
  { code: "+49",  country: "DE", name: "Germany" },
  { code: "+33",  country: "FR", name: "France" },
  { code: "+81",  country: "JP", name: "Japan" },
  { code: "+86",  country: "CN", name: "China" },
  { code: "+7",   country: "RU", name: "Russia" },
  { code: "+55",  country: "BR", name: "Brazil" },
  { code: "+27",  country: "ZA", name: "South Africa" },
  { code: "+92",  country: "PK", name: "Pakistan" },
  { code: "+880", country: "BD", name: "Bangladesh" },
  { code: "+94",  country: "LK", name: "Sri Lanka" },
  { code: "+977", country: "NP", name: "Nepal" },
  { code: "+60",  country: "MY", name: "Malaysia" },
];

function PhoneInput({ value, onChange, error }) {
  const [selectedCode, setSelectedCode] = useState(COUNTRY_CODES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    c.country.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
    onChange(selectedCode.code + digits, digits);
  };

  const handleCodeSelect = (c) => {
    setSelectedCode(c);
    setDropdownOpen(false);
    setSearch("");
    const digits = value.replace(/\D/g, "").slice(0, 15);
    onChange(c.code + digits, digits);
  };

  const displayValue = value.replace(/\D/g, "").slice(0, 15);

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      <div className={`flex h-9 rounded-md border bg-white/5 overflow-hidden ${error ? "border-red-500" : "border-white/10"}`}>
        <button type="button" onClick={() => setDropdownOpen(o => !o)}
          className="flex items-center gap-1 px-2 border-r border-white/10 hover:bg-white/10 transition-colors shrink-0">
          <img src={`https://flagcdn.com/24x18/${selectedCode.country.toLowerCase()}.png`} alt={selectedCode.country}
            style={{ width: "1.25rem", height: "0.9375rem", objectFit: "cover", borderRadius: "2px" }} />
          <span className="text-xs text-foreground font-medium">{selectedCode.code}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        <input type="tel" placeholder="Phone number" value={displayValue} onChange={handlePhoneChange}
          className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
      </div>
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 z-50 rounded-xl overflow-hidden shadow-2xl bg-popover border border-border"
          style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}>
          <div className="p-2 border-b border-border">
            <input autoFocus placeholder="Search country..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-1.5 text-xs outline-none bg-muted text-foreground placeholder:text-muted-foreground border border-border" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((c, i) => (
              <button key={`${c.country}-${i}`} onClick={() => handleCodeSelect(c)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left">
                <img src={`https://flagcdn.com/24x18/${c.country.toLowerCase()}.png`} alt={c.country}
                  style={{ width: "1.5rem", height: "1.125rem", objectFit: "cover", borderRadius: "2px", flexShrink: 0 }} />
                <span className="text-xs text-foreground flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function POS() {
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [tableNum, setTableNum] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneDigits, setCustomerPhoneDigits] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const [posAd, setPosAd] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [orderErrors, setOrderErrors] = useState({});
  const [voidError, setVoidError] = useState("");
  const [branchSettings, setBranchSettings] = useState(null);
  const [canonicalBranchName, setCanonicalBranchName] = useState("Main Branch");
  const [printOnSave, setPrintOnSave] = useState(false);

  useEffect(() => {
    base44.entities.MenuItem.list("name", 500).then(items => {
      setMenuItems(items.filter(i => i.is_available !== false));
      setMenuLoading(false);
    }).catch(() => setMenuLoading(false));

    base44.entities.Advertisement.filter({ is_active: true, placement: "pos_screen" })
      .then(ads => setPosAd(ads[0] || null)).catch(() => {});

    // Load branch using canonical name from Branch entity
    const currentUser = getCurrentUser();
    const userBranch = (currentUser.branch_id && currentUser.branch_id !== "All Branches")
      ? currentUser.branch_id : null;

    Promise.all([
      base44.entities.BranchSettings.list("branch_name", 100),
      base44.entities.Branch.list("name", 100),
    ])// In POS.jsx, replace the .then(([settingsData, branchData]) => { ... }) block:

.then(([settingsData, branchData]) => {
  const matchedBranch = branchData.find(b =>
    b.name?.toLowerCase() === userBranch?.toLowerCase()
  );
  const canonical = matchedBranch?.name || userBranch || branchData[0]?.name || "Main Branch";
  setCanonicalBranchName(canonical);

  // ── Pull from localStorage (saved by Settings page) ──
  const localSettings = (() => {
    try { return JSON.parse(localStorage.getItem("churi_settings") || "{}"); } catch { return {}; }
  })();

  const match = settingsData.find(r =>
    r.branch_name?.toLowerCase() === canonical.toLowerCase()
  ) || settingsData.find(r =>
    r.branch_name?.toLowerCase() === "main branch"
  ) || settingsData.find(r => r.branch_id === "main") || settingsData[0];

  // ── Merge: localStorage wins for fields the Settings page controls ──
  setBranchSettings({
    ...(match || {}),
    restaurant_name: localSettings.restaurant_name || match?.restaurant_name || "Churi House",
    branch_name: localSettings.branch_name || canonical,   // ← THIS was the bug
    address:     localSettings.address     || match?.address || "",
    phone:       localSettings.phone       || match?.phone || "",
    gst_number:  localSettings.gst_number  || match?.gst_number || "",
    fssai_number:localSettings.fssai_number|| match?.fssai_number || "",
    tagline:     localSettings.tagline     || match?.tagline || "",
    receipt_footer: localSettings.receipt_footer || match?.receipt_footer || "Thank you!",
    receipt_logo_url: localSettings.receipt_logo_url || match?.receipt_logo_url || "",
    receipt_qr_url:   localSettings.receipt_qr_url  || match?.receipt_qr_url  || "",
    upi_id:      localSettings.upi_id      || match?.upi_id || "",
  });
}).catch(() => {});
  }, []);

  const customCats = loadCustomCategories();
  const allCategories = ["All", ...DEFAULT_CATEGORIES, ...customCats.filter(c => !DEFAULT_CATEGORIES.includes(c))];
  const menuCats = [...new Set(menuItems.map(i => i.category).filter(Boolean))];
  const extraCats = menuCats.filter(c => !allCategories.includes(c));
  const categories = [...allCategories, ...extraCats];

  const filtered = menuItems.filter(
    i => (category === "All" || i.category === category) && i.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0)
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const validateOrder = () => {
    const next = {};
    if (cart.length === 0) next.cart = "Add at least one item";
    if (!customerName.trim()) next.customerName = "Customer name is required";
    if (orderType === "dine_in" && !tableNum.trim()) next.tableNum = "Table number is required";
    phoneNumber(next, "customerPhone", customerPhoneDigits);
    setOrderErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async (paymentMethod) => {
    if (!validateOrder()) return;
    const currentUser = getCurrentUser();
    const orderNum = `CH-${Date.now().toString(36).toUpperCase()}`;
    const order = {
      order_number: orderNum,
      type: orderType,
      status: "pending",
      branch_name: canonicalBranchName,
      items: cart.map(c => ({ name: c.name, quantity: c.qty, price: c.price })),
      subtotal, tax, discount: 0, total,
      payment_method: paymentMethod,
      table_number: tableNum,
      customer_name: customerName,
      customer_phone: customerPhone,
      billed_by: currentUser.full_name || currentUser.username || currentUser.email || "Unknown",
    };
    await base44.entities.Order.create(order);

    if (orderType === "dine_in" && tableNum?.trim()) {
      try {
        const tables = await base44.entities.Table.list("num", 200);
        const tableMatch = tables.find(t => String(t.num) === String(tableNum.trim()));
        if (tableMatch?.id) {
          await base44.entities.Table.update(tableMatch.id, { status: "occupied" });
        }
      } catch (err) {
        console.error("Failed to update table status from POS:", err);
      }
    }

    logAudit({ action: `Order placed: ${orderNum}`, type: "order", details: `${paymentMethod} | ₹${total} | ${orderType}` });
    if (printOnSave) { setLastOrder(order); setShowReceipt(true); }
    setCart([]);
    setTableNum("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPhoneDigits("");
  };

  const handleVoidCart = async () => {
    if (!voidReason.trim()) { setVoidError("Reason is required."); return; }
    const currentUser = getCurrentUser();
    const orderNum = `VOID-${Date.now().toString(36).toUpperCase()}`;
    await base44.entities.DeletedOrder.create({
      order_number: orderNum,
      order_data: JSON.stringify({ items: cart, subtotal, tax, total, orderType, tableNum, customerName }),
      deleted_by: currentUser.full_name || currentUser.username || currentUser.email || "POS User",
      deleted_at: new Date().toISOString(),
      bill_generated: false,
      reason: voidReason,
      restored: false,
    });
    logAudit({ action: `Cart voided: ${orderNum}`, type: "order", details: `Reason: ${voidReason} | ₹${total}` });
    setCart([]);
    setTableNum("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPhoneDigits("");
    setVoidReason("");
    setShowVoidModal(false);
  };

  const defaultSettings = {
    receipt_header: "Churi House",
    receipt_footer: "Thank you!",
    show_gst: true, show_discount: true, show_branch_address: true,
    show_phone: true, show_order_type: true, show_table_number: true, show_payment_method: true,
  };

  return (
    <div className="flex flex-col h-screen">
      {posAd && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
          {posAd.image_url && <img src={posAd.image_url} alt="" className="h-6 object-contain rounded mr-2" />}
          <p className="text-xs font-medium text-primary flex-1 truncate">
            {posAd.title}{posAd.description ? ` — ${posAd.description}` : ""}
          </p>
          <button onClick={() => setPosAd(null)} className="text-muted-foreground ml-3 hover:text-foreground text-xs">✕</button>
        </div>
      )}

      {showReceipt && lastOrder && (
        <ReceiptPreview order={lastOrder} settings={branchSettings || defaultSettings}
          onClose={() => { setShowReceipt(false); setLastOrder(null); }} />
      )}

      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Void Cart</h2>
              <button onClick={() => setShowVoidModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground">This will clear the cart and log the void with a reason.</p>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Reason *</label>
              <Input value={voidReason} onChange={e => { setVoidReason(e.target.value); setVoidError(""); }}
                placeholder="e.g. Customer changed mind"
                className={`h-9 bg-white/5 border-white/10 text-sm ${voidError ? "border-red-500" : ""}`} />
              {voidError && <p className="text-xs text-red-400">{voidError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowVoidModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleVoidCart}>Void</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5 bg-sidebar border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-muted-foreground">|</span>
        <span className="text-sm font-semibold text-foreground">POS / Billing</span>
        <span className="text-xs text-primary ml-1">— {canonicalBranchName}</span>
        {menuLoading && <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white/5 border-white/10" />
            </div>
            <div className="flex gap-1 glass rounded-xl p-1">
              {[
                ["dine_in", "🍽️ Dine-in"],
                ["takeaway", "🥡 Takeaway"],
                ["swiggy", "🛵 Swiggy"],
                ["zomato", "🔴 Zomato"],
              ].map(([v, l]) => (
                <button key={v} onClick={() => { setOrderType(v); setOrderErrors({}); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    orderType === v
                      ? v === "swiggy" ? "bg-orange-500 text-white shadow-md"
                      : v === "zomato" ? "bg-red-500 text-white shadow-md"
                      : v === "takeaway" ? "bg-blue-500 text-white shadow-md"
                      : "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${category === c ? "bg-primary text-primary-foreground glow-orange" : "glass text-muted-foreground hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>

          {menuLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
              {filtered.length === 0 ? (
                <div className="col-span-4 text-center py-10 text-muted-foreground text-sm">
                  No items found. Add items via Menu Management.
                </div>
              ) : filtered.map(item => (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="glass rounded-2xl p-4 text-left hover:glow-orange transition-all duration-200 group"
                  style={item.color ? { borderColor: item.color, borderWidth: 1 } : {}}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-3 h-3 rounded-sm border-2 ${item.is_veg ? "border-green-500" : "border-red-500"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full m-auto mt-0.5 ${item.is_veg ? "bg-green-500" : "bg-red-500"}`} />
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                  <p className="text-base font-bold text-primary mt-2">₹{item.price}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-80 xl:w-96 bg-sidebar border-l border-sidebar-border flex flex-col">
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Current Order</h2>
              <span className="ml-auto text-xs text-muted-foreground">{cart.length} items</span>
            </div>

            {orderType === "dine_in" && (
              <>
                <Input placeholder="Table number" value={tableNum}
                  onChange={e => { setTableNum(e.target.value); setOrderErrors(er => ({ ...er, tableNum: "" })); }}
                  className={`mt-3 h-9 bg-white/5 border-white/10 text-sm ${fieldError(orderErrors, "tableNum") ? "border-red-500" : ""}`} />
                {fieldError(orderErrors, "tableNum") && <p className="text-xs text-red-400 mt-1">{fieldError(orderErrors, "tableNum")}</p>}
              </>
            )}

            <Input placeholder="Customer name" value={customerName}
              onChange={e => { setCustomerName(e.target.value); setOrderErrors(er => ({ ...er, customerName: "" })); }}
              className={`mt-2 h-9 bg-white/5 border-white/10 text-sm ${fieldError(orderErrors, "customerName") ? "border-red-500" : ""}`} />
            {fieldError(orderErrors, "customerName") && <p className="text-xs text-red-400 mt-1">{fieldError(orderErrors, "customerName")}</p>}

            <PhoneInput
              value={customerPhoneDigits}
              onChange={(full, digits) => { setCustomerPhone(full); setCustomerPhoneDigits(digits); setOrderErrors(er => ({ ...er, customerPhone: "" })); }}
              error={fieldError(orderErrors, "customerPhone")}
            />
            {fieldError(orderErrors, "customerPhone") && <p className="text-xs text-red-400 mt-1">{fieldError(orderErrors, "customerPhone")}</p>}
            {fieldError(orderErrors, "cart") && <p className="text-xs text-red-400 mt-2">{fieldError(orderErrors, "cart")}</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No items added</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-primary">₹{item.price * item.qty}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                    {item.qty === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <span className="text-sm font-semibold text-foreground w-6 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-sidebar-border space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{subtotal}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span>₹{tax}</span></div>
              <div className="flex justify-between text-foreground font-bold text-lg border-t border-white/10 pt-2">
                <span>Total</span><span className="text-primary">₹{total}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Print receipt after order</span>
              </div>
              <button onClick={() => setPrintOnSave(p => !p)}
                className={`w-10 h-5 rounded-full transition-all relative ${printOnSave ? "bg-primary" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${printOnSave ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => placeOrder("cash")} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all">
                <Banknote className="w-4 h-4 mr-1" /> Cash
              </Button>
              <Button onClick={() => placeOrder("card")} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all">
                <CreditCard className="w-4 h-4 mr-1" /> Card
              </Button>
              <Button onClick={() => placeOrder("upi")} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all">
                <Smartphone className="w-4 h-4 mr-1" /> UPI
              </Button>
            </div>

            <Button onClick={() => cart.length > 0 ? setShowVoidModal(true) : null} disabled={cart.length === 0}
              variant="outline" className="w-full h-9 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold">
              <Trash2 className="w-4 h-4 mr-1" /> Void Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}