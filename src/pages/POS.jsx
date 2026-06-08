import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, ArrowLeft, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import ReceiptPreview from "@/components/ReceiptPreview";
import { logAudit } from "@/lib/auditLog";
import { fieldError } from "@/lib/formValidation";

const raw = JSON.parse(localStorage.getItem("local_AppUser") || "{}");
const currentUser = Array.isArray(raw) ? raw[0] : raw;
const LS_CAT_KEY = "menu_custom_categories";
const DEFAULT_CATEGORIES = ["Starters", "Main Course", "Biryani", "Breads", "Desserts", "Beverages"];

function loadCustomCategories() {
  try { return JSON.parse(localStorage.getItem(LS_CAT_KEY) || "[]"); } catch { return []; }
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
  const [lastOrder, setLastOrder] = useState(null);
  const [posAd, setPosAd] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [orderErrors, setOrderErrors] = useState({});
  const [voidError, setVoidError] = useState("");

  useEffect(() => {
    base44.entities.MenuItem.list("name", 500).then(items => {
      setMenuItems(items.filter(i => i.is_available !== false));
      setMenuLoading(false);
    }).catch(() => setMenuLoading(false));

    base44.entities.Advertisement.filter({ is_active: true, placement: "pos_screen" })
      .then(ads => setPosAd(ads[0] || null)).catch(() => {});
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

  const placeOrder = async (paymentMethod, print = false) => {
    const orderNum = `CH-${Date.now().toString(36).toUpperCase()}`;
    const order = {
  order_number: orderNum,
  type: orderType,
  status: "pending",
  items: cart.map(c => ({ name: c.name, quantity: c.qty, price: c.price })),
  subtotal, tax, discount: 0, total,
  payment_method: paymentMethod,
  table_number: tableNum,
  customer_name: customerName,
  customer_phone: customerPhone,
  billed_by: currentUser.full_name || currentUser.username || "Unknown", 
};
    await base44.entities.Order.create(order);
    logAudit({ action: `Order placed: ${orderNum}`, type: "order", details: `${paymentMethod} | ₹${total} | ${orderType}` });
    setLastOrder(order);
    if (print) setShowReceipt(true);
    setCart([]);
    setTableNum("");
    setCustomerName("");
    setCustomerPhone("");
  };

  const handleVoidCart = async () => {
    if (!voidReason.trim()) return;
    const orderNum = `VOID-${Date.now().toString(36).toUpperCase()}`;
    await base44.entities.DeletedOrder.create({
      order_number: orderNum,
      order_data: JSON.stringify({ items: cart, subtotal, tax, total, orderType, tableNum, customerName }),
      deleted_by: currentUser.full_name || currentUser.username || "POS User",
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
    setVoidReason("");
    setShowVoidModal(false);
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

      {lastOrder && (
        <ReceiptPreview
          order={lastOrder}
          settings={{ receipt_header: "Churi House — Main Branch", receipt_footer: "Thank you!", show_gst: true, show_discount: true, show_branch_address: true }}
          onClose={() => { setLastOrder(null); setShowReceipt(false); }}
        />
      )}

      {showReceipt && lastOrder && (
        <ReceiptPreview
          order={lastOrder}
          settings={{ receipt_header: "Churi House — Main Branch", receipt_footer: "Thank you!", show_gst: true, show_discount: false, show_branch_address: true }}
          onClose={() => { setShowReceipt(false); setLastOrder(null); }}
        />
      )}

      {/* Void Cart Modal */}
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

      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-sidebar border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-muted-foreground">|</span>
        <span className="text-sm font-semibold text-foreground">POS / Billing</span>
        {menuLoading && <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu Side */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white/5 border-white/10" />
            </div>
            <div className="flex gap-1 glass rounded-xl p-1">
              {[["dine_in", "Dine-in"], ["takeaway", "Takeaway"], ["swiggy", "Swiggy"], ["zomato", "Zomato"]].map(([v, l]) => (
                <button key={v} onClick={() => { setOrderType(v); setOrderErrors({}); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${orderType === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
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

        {/* Cart Side */}
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
            <Input placeholder="Phone number" value={customerPhone}
              onChange={e => { setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setOrderErrors(er => ({ ...er, customerPhone: "" })); }}
              className={`mt-2 h-9 bg-white/5 border-white/10 text-sm ${fieldError(orderErrors, "customerPhone") ? "border-red-500" : ""}`} />
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
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => placeOrder("cash")} disabled={cart.length === 0}
                className="h-10 bg-primary hover:bg-primary/90 text-xs font-semibold glow-orange">
                <Banknote className="w-4 h-4 mr-1" /> Cash
              </Button>
              <Button onClick={() => placeOrder("card")} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold">
                <CreditCard className="w-4 h-4 mr-1" /> Card
              </Button>
              <Button onClick={() => placeOrder("upi")} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold">
                <Smartphone className="w-4 h-4 mr-1" /> UPI
              </Button>
              <Button onClick={() => placeOrder("cash", true)} disabled={cart.length === 0}
                variant="outline" className="h-10 bg-white/5 border-white/10 text-xs font-semibold">
                <Receipt className="w-4 h-4 mr-1" /> Print
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