import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Plus, Pencil, Trash2, X, CheckCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";
import VendorPaymentModal from "@/components/VendorPaymentModal";

const ST = { draft:"bg-muted text-muted-foreground", sent:"bg-blue-500/10 text-blue-400", pending:"bg-yellow-500/10 text-yellow-400", partially_received:"bg-orange-500/10 text-orange-400", delivered:"bg-green-500/10 text-green-400", cancelled:"bg-red-500/10 text-red-400" };
const PST = { unpaid:"bg-red-500/10 text-red-400", partial:"bg-yellow-500/10 text-yellow-400", paid:"bg-green-500/10 text-green-400" };

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payPO, setPayPO] = useState(null);
  const [form, setForm] = useState({ vendor_name: "", total_amount: 0, grand_total: 0, expected_date: "", status: "draft", payment_status: "unpaid", notes: "" });
  const [errors, setErrors] = useState({});

  const load = async () => {
    const [p, v] = await Promise.all([
      base44.entities.PurchaseOrder.list("-created_date", 50),
      base44.entities.Vendor.list("name", 100)
    ]);
    setPos(p); setVendors(v); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ vendor_name: "", total_amount: 0, grand_total: 0, expected_date: "", status: "draft", payment_status: "unpaid", notes: "" }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setErrors({}); setForm({ vendor_name: p.vendor_name, total_amount: p.total_amount||0, grand_total: p.grand_total||0, expected_date: p.expected_date||"", status: p.status, payment_status: p.payment_status||"unpaid", notes: p.notes||"" }); setShowForm(true); };

  const validate = () => {
    const next = {};
    required(next, "vendor_name", form.vendor_name);
    positiveNumber(next, "total_amount", form.total_amount);
    positiveNumber(next, "grand_total", form.grand_total);
    required(next, "expected_date", form.expected_date);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const poNum = `PO-${String(Date.now()).slice(-4)}`;
    if (editing) {
      await base44.entities.PurchaseOrder.update(editing.id, form);
      toast.success(`✅ PO for ${form.vendor_name} updated successfully.`);
    } else {
      await base44.entities.PurchaseOrder.create({ ...form, po_number: poNum });
      toast.success(`✅ Purchase Order ${poNum} created successfully.`);
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
      toast.success(`🗑️ ${p?.po_number || "PO"} permanently deleted.`);
      load();
    }
  };

  const payPOVendor = (p) => {
    const vendor = vendors.find(v => v.name === p.vendor_name) || { id: p.vendor_id, name: p.vendor_name, outstanding_balance: p.grand_total };
    setPayPO({ ...vendor, outstanding_balance: p.grand_total || p.total_amount });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1><p className="text-sm text-muted-foreground">{pos.length} orders</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New PO</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        pos.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No purchase orders yet.</p>
            <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> New PO</Button>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["PO #","Vendor","Amount","Expected","Status","Payment","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {pos.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{p.po_number || "—"}</td>
                    <td className="p-4 text-foreground">{p.vendor_name}</td>
                    <td className="p-4 font-semibold text-primary">₹{(p.grand_total||p.total_amount||0).toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{p.expected_date || "—"}</td>
                    <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ST[p.status]||ST.draft}`}>{p.status}</span></td>
                    <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PST[p.payment_status||"unpaid"]}`}>{p.payment_status||"unpaid"}</span></td>
                    <td className="p-4">
                      <div className="flex gap-1">
                       {p.status !== "delivered" && <Button title="Mark as Received" size="sm" variant="outline" className="h-7 text-xs bg-green-500/10 border-green-500/20 text-green-400 px-2" onClick={() => markReceived(p)}><CheckCircle className="w-3 h-3" /></Button>}
                       {p.payment_status !== "paid" && <Button title="Record Payment" size="sm" variant="outline" className="h-7 text-xs bg-primary/10 border-primary/20 text-primary px-2" onClick={() => payPOVendor(p)}><CreditCard className="w-3 h-3" /></Button>}
                       <Button title="Edit PO" size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10 px-2" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                       <Button title="Delete PO" size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 border-red-500/20 text-red-400 px-2" onClick={() => remove(p.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit PO" : "New Purchase Order"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Vendor *</Label>
                {vendors.length > 0 ? (
                  <select value={form.vendor_name} onChange={e => { setForm(f => ({...f, vendor_name: e.target.value})); setErrors(er => ({...er, vendor_name: ""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "vendor_name") ? "border-red-500" : "border-white/10"}`}>
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                ) : (
                  <Input value={form.vendor_name} onChange={e => { setForm(f => ({...f, vendor_name: e.target.value})); setErrors(er => ({...er, vendor_name: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "vendor_name") ? "border-red-500" : ""}`} placeholder="Vendor name..." />
                )}
                {fieldError(errors, "vendor_name") && <p className="text-xs text-red-400">{fieldError(errors, "vendor_name")}</p>}
              </div>
              {[ ["total_amount","Sub Total *","number"], ["grand_total","Grand Total *","number"], ["expected_date","Expected Date *","date"] ].map(([k,l,t]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs">{l}</Label>
                  <Input type={t} value={form[k]} onChange={e => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                  {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["draft","sent","pending","partially_received","delivered","cancelled"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
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