import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Plus, Pencil, Trash2, X, CheckCircle, CreditCard, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";
import VendorPaymentModal from "@/components/VendorPaymentModal";

const ST = { draft:"bg-muted text-muted-foreground", sent:"bg-blue-500/10 text-blue-400", pending:"bg-yellow-500/10 text-yellow-400", partially_received:"bg-orange-500/10 text-orange-400", delivered:"bg-green-500/10 text-green-400", cancelled:"bg-red-500/10 text-red-400" };
const PST = { unpaid:"bg-red-500/10 text-red-400", partial:"bg-yellow-500/10 text-yellow-400", paid:"bg-green-500/10 text-green-400" };

const UNITS = ["kg", "L", "pcs", "box", "dozen", "g", "ml"];

const emptyItem = () => ({ name: "", quantity: 1, unit: "kg", unit_price: 0 });

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payPO, setPayPO] = useState(null);
  const [showItems, setShowItems] = useState(null); // for viewing items of a PO
  const [form, setForm] = useState({
    vendor_name: "", expected_date: "", status: "draft",
    payment_status: "unpaid", notes: "",
    items: [emptyItem()],
  });
  const [errors, setErrors] = useState({});

  const load = async () => {
    const [p, v, inv] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date", 50),
      base44.entities.Vendor.list("name", 100),
      base44.entities.InventoryItem.list("name", 200).catch(() => []),
    ]);
    setPos(p); setVendors(v); setInventoryItems(inv); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Item helpers ─────────────────────────────────────────────────────────
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, key, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item),
  }));

  const calcTotals = (items) => {
    const sub = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    return { total_amount: sub, grand_total: sub };
  };

  const openNew = () => {
    setEditing(null); setErrors({});
    setForm({ vendor_name: "", expected_date: "", status: "draft", payment_status: "unpaid", notes: "", items: [emptyItem()] });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p); setErrors({});
    setForm({
      vendor_name: p.vendor_name, expected_date: p.expected_date || "",
      status: p.status, payment_status: p.payment_status || "unpaid",
      notes: p.notes || "",
      items: p.items?.length ? p.items : [emptyItem()],
    });
    setShowForm(true);
  };

  const validate = () => {
    const next = {};
    required(next, "vendor_name", form.vendor_name);
    required(next, "expected_date", form.expected_date);
    if (form.items.length === 0) next.items = "Add at least one item.";
    form.items.forEach((it, i) => {
      if (!it.name?.trim()) next[`item_name_${i}`] = "Item name required";
      if (!it.quantity || Number(it.quantity) <= 0) next[`item_qty_${i}`] = "Valid qty required";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const { total_amount, grand_total } = calcTotals(form.items);
    const poNum = `PO-${String(Date.now()).slice(-4)}`;
    const data = { ...form, total_amount, grand_total };
    if (editing) {
      await base44.entities.PurchaseOrder.update(editing.id, data);
      toast.success(`✅ PO for ${form.vendor_name} updated.`);
    } else {
      await base44.entities.PurchaseOrder.create({ ...data, po_number: poNum });
      toast.success(`✅ Purchase Order ${poNum} created.`);
    }
    setShowForm(false); load();
  };

  const markReceived = async (p) => {
    await base44.entities.PurchaseOrder.update(p.id, { status: "delivered", received_date: new Date().toISOString().split("T")[0] });
    toast.success(`✅ ${p.po_number || "PO"} marked as received.`);
    load();
  };

  const remove = async (id) => {
    const p = pos.find(x => x.id === id);
    if (confirm("Delete PO?")) {
      await base44.entities.PurchaseOrder.delete(id);
      toast.success(`🗑️ ${p?.po_number || "PO"} deleted.`);
      load();
    }
  };

  const payPOVendor = (p) => {
    const vendor = vendors.find(v => v.name === p.vendor_name) || { id: p.vendor_id, name: p.vendor_name };
    setPayPO({ ...vendor, outstanding_balance: p.grand_total || p.total_amount });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1><p className="text-sm text-muted-foreground">{pos.length} orders</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New PO</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : pos.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No purchase orders yet.</p>
          <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> New PO</Button>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["PO #","Vendor","Items","Amount","Expected","Status","Payment","Actions"].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono font-bold text-foreground">{p.po_number || "—"}</td>
                  <td className="p-4 text-foreground">{p.vendor_name}</td>
                  <td className="p-4">
                    {p.items?.length > 0 ? (
                      <button
                        onClick={() => setShowItems(p)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Package className="w-3 h-3" />
                        {p.items.length} item{p.items.length > 1 ? "s" : ""}
                      </button>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="p-4 font-semibold text-primary">₹{(p.grand_total || p.total_amount || 0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">{p.expected_date || "—"}</td>
                  <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ST[p.status] || ST.draft}`}>{p.status}</span></td>
                  <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PST[p.payment_status || "unpaid"]}`}>{p.payment_status || "unpaid"}</span></td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {p.status !== "delivered" && <Button title="Mark Received" size="sm" variant="outline" className="h-7 text-xs bg-green-500/10 border-green-500/20 text-green-400 px-2" onClick={() => markReceived(p)}><CheckCircle className="w-3 h-3" /></Button>}
                      {p.payment_status !== "paid" && <Button title="Record Payment" size="sm" variant="outline" className="h-7 text-xs bg-primary/10 border-primary/20 text-primary px-2" onClick={() => payPOVendor(p)}><CreditCard className="w-3 h-3" /></Button>}
                      <Button title="Edit" size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10 px-2" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                      <Button title="Delete" size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 border-red-500/20 text-red-400 px-2" onClick={() => remove(p.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Items Modal */}
      {showItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">{showItems.po_number} — Items</h2>
                <p className="text-xs text-muted-foreground">Vendor: {showItems.vendor_name}</p>
              </div>
              <button onClick={() => setShowItems(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Item","Qty","Unit","Unit Price","Total"].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showItems.items.map((it, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-3 font-medium text-foreground">{it.name}</td>
                      <td className="p-3 text-muted-foreground">{it.quantity}</td>
                      <td className="p-3 text-muted-foreground">{it.unit}</td>
                      <td className="p-3 text-muted-foreground">₹{it.unit_price}</td>
                      <td className="p-3 font-semibold text-primary">₹{(Number(it.quantity) * Number(it.unit_price)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td colSpan={4} className="p-3 text-right font-semibold text-foreground">Grand Total</td>
                    <td className="p-3 font-bold text-primary">₹{(showItems.grand_total || showItems.total_amount || 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Button variant="outline" className="w-full bg-white/5 border-white/10" onClick={() => setShowItems(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* New/Edit PO Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit PO" : "New Purchase Order"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Vendor */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Vendor *</Label>
                {vendors.length > 0 ? (
                  <select value={form.vendor_name} onChange={e => { setForm(f => ({ ...f, vendor_name: e.target.value })); setErrors(er => ({ ...er, vendor_name: "" })); }}
                    className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "vendor_name") ? "border-red-500" : "border-white/10"}`}>
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                ) : (
                  <Input value={form.vendor_name} onChange={e => { setForm(f => ({ ...f, vendor_name: e.target.value })); setErrors(er => ({ ...er, vendor_name: "" })); }}
                    className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "vendor_name") ? "border-red-500" : ""}`} placeholder="Vendor name..." />
                )}
                {fieldError(errors, "vendor_name") && <p className="text-xs text-red-400">{fieldError(errors, "vendor_name")}</p>}
              </div>

              {/* Date & Status */}
              <div className="space-y-1.5">
                <Label className="text-xs">Expected Date *</Label>
                <Input type="date" value={form.expected_date} onChange={e => { setForm(f => ({ ...f, expected_date: e.target.value })); setErrors(er => ({ ...er, expected_date: "" })); }}
                  className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "expected_date") ? "border-red-500" : ""}`} />
                {fieldError(errors, "expected_date") && <p className="text-xs text-red-400">{fieldError(errors, "expected_date")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["draft","sent","pending","partially_received","delivered","cancelled"].map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                </select>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Items *</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {errors.items && <p className="text-xs text-red-400">{errors.items}</p>}

              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-2 text-muted-foreground">Item Name</th>
                      <th className="text-left p-2 text-muted-foreground w-20">Qty</th>
                      <th className="text-left p-2 text-muted-foreground w-20">Unit</th>
                      <th className="text-left p-2 text-muted-foreground w-24">Unit Price ₹</th>
                      <th className="text-left p-2 text-muted-foreground w-20">Total</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="p-1.5">
                          {inventoryItems.length > 0 ? (
                            <select value={item.name} onChange={e => {
                              const inv = inventoryItems.find(x => x.name === e.target.value);
                              updateItem(i, "name", e.target.value);
                              if (inv) updateItem(i, "unit", inv.unit);
                            }}
                              className={`w-full h-8 rounded-md bg-secondary border text-xs px-2 text-foreground ${errors[`item_name_${i}`] ? "border-red-500" : "border-white/10"}`}>
                              <option value="">Select item...</option>
                              {inventoryItems.map(inv => <option key={inv.id} value={inv.name}>{inv.name}</option>)}
                              <option value="__custom__">+ Custom item</option>
                            </select>
                          ) : (
                            <Input value={item.name} onChange={e => updateItem(i, "name", e.target.value)}
                              className={`h-8 bg-white/5 border-white/10 text-xs ${errors[`item_name_${i}`] ? "border-red-500" : ""}`}
                              placeholder="Item name" />
                          )}
                          {item.name === "__custom__" && (
                            <Input value={item.custom_name || ""} onChange={e => updateItem(i, "custom_name", e.target.value)}
                              className="h-8 bg-white/5 border-white/10 text-xs mt-1" placeholder="Enter item name" />
                          )}
                          {errors[`item_name_${i}`] && <p className="text-[10px] text-red-400">{errors[`item_name_${i}`]}</p>}
                        </td>
                        <td className="p-1.5">
                          <Input type="number" min="0" value={item.quantity}
                            onChange={e => updateItem(i, "quantity", e.target.value)}
                            className={`h-8 bg-white/5 border-white/10 text-xs ${errors[`item_qty_${i}`] ? "border-red-500" : ""}`} />
                        </td>
                        <td className="p-1.5">
                          <select value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)}
                            className="w-full h-8 rounded-md bg-secondary border border-white/10 text-xs px-1 text-foreground">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <Input type="number" min="0" value={item.unit_price}
                            onChange={e => updateItem(i, "unit_price", e.target.value)}
                            className="h-8 bg-white/5 border-white/10 text-xs" />
                        </td>
                        <td className="p-1.5 font-semibold text-primary text-xs">
                          ₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString()}
                        </td>
                        <td className="p-1.5">
                          {form.items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/5">
                      <td colSpan={4} className="p-2 text-right font-semibold text-foreground text-xs">Grand Total</td>
                      <td className="p-2 font-bold text-primary text-xs">
                        ₹{calcTotals(form.items).grand_total.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-9 bg-white/5 border-white/10 text-sm" placeholder="Any special instructions..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save PO</Button>
            </div>
          </div>
        </div>
      )}

      {payPO && <VendorPaymentModal vendor={payPO} onClose={() => { setPayPO(null); load(); }} />}
    </div>
  );
}