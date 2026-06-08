import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Pencil, Trash2, X, CreditCard, Receipt } from "lucide-react";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VendorPaymentModal from "@/components/VendorPaymentModal";

const CATEGORIES = ["Produce","Meat & Poultry","Dairy","Spices","Beverages","Dry Goods","Packaging","Other"];

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payVendor, setPayVendor] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    base44.entities.VendorPayment.list("-created_date", 100)
      .then(d => { setPayments(d); setPaymentsLoading(false); })
      .catch(() => setPaymentsLoading(false));
  }, []);
  const [form, setForm] = useState({ name: "", category: "Produce", phone: "", email: "", address: "", gstin: "", outstanding_balance: 0, credit_limit: 50000, payment_terms: "Net 30", status: "active" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Vendor.list("name", 100).then(d => { setVendors(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ name: "", category: "Produce", phone: "", email: "", address: "", gstin: "", outstanding_balance: 0, credit_limit: 50000, payment_terms: "Net 30", status: "active" }); setShowForm(true); };
  const openEdit = (v) => { setEditing(v); setErrors({}); setForm({ name: v.name, category: v.category||"Produce", phone: v.phone||"", email: v.email||"", address: v.address||"", gstin: v.gstin||"", outstanding_balance: v.outstanding_balance||0, credit_limit: v.credit_limit||50000, payment_terms: v.payment_terms||"Net 30", status: v.status }); setShowForm(true); };

  const validateVendor = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Vendor name is required.";
    if (!form.phone.trim()) errs.phone = "Phone is required.";
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = "Phone must be exactly 10 digits.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validateVendor()) return;
    if (editing) {
      await base44.entities.Vendor.update(editing.id, form);
      logAudit({ action: `Vendor updated: ${form.name}`, type: "admin", details: `Category: ${form.category}` });
      toast.success(`✅ ${form.name} updated successfully.`);
    } else {
      await base44.entities.Vendor.create(form);
      logAudit({ action: `Vendor added: ${form.name}`, type: "admin", details: `Category: ${form.category}` });
      toast.success(`✅ ${form.name} added successfully.`);
    }
    setShowForm(false); load();
  };

  const remove = async (id) => {
    const vendor = vendors.find(v => v.id === id);
    if (!vendor || !confirm(`Delete vendor "${vendor.name}"?`)) return;
    await softDelete({ module: "Vendor", id: vendor.id, name: vendor.name, data: vendor });
    await base44.entities.Vendor.delete(id);
    logAudit({ action: `Vendor deleted: ${vendor.name}`, type: "admin", details: `Category: ${vendor.category}` });
    toast.success(`🗑️ ${vendor.name} moved to Recycle Bin.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Vendors</h1><p className="text-sm text-muted-foreground">{vendors.length} suppliers</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Vendor</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        vendors.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No vendors yet. Add your first vendor.</p>
            <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Vendor</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${v.status === "active" ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>{v.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{v.name}</h3>
                <p className="text-xs text-muted-foreground">{v.category}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{v.phone}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <div><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-sm font-bold text-primary">₹{(v.outstanding_balance||0).toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-[10px] text-muted-foreground">Terms</p><p className="text-xs text-foreground">{v.payment_terms || "—"}</p></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" onClick={() => setPayVendor(v)}><CreditCard className="w-3 h-3 mr-1" /> Pay</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10" onClick={() => openEdit(v)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => remove(v.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Vendor" : "New Vendor"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["name","Vendor Name *","text"],["phone","Phone *","text"],["email","Email *","email"],["gstin","GSTIN","text"],["outstanding_balance","Outstanding Balance","number"],["credit_limit","Credit Limit","number"],["payment_terms","Payment Terms","text"],["address","Address","text"]].map(([k,l,t]) => (
                <div key={k} className={`space-y-1.5 ${k === "address" ? "col-span-2" : ""}`}>
                  <Label className="text-xs">{l}</Label>
                  <Input
                    type={t}
                    value={form[k]}
                    onChange={e => {
                      const val = t === "number" ? Number(e.target.value) : (k === "phone" ? e.target.value.replace(/\D/g,"").slice(0,10) : e.target.value);
                      setForm(f => ({...f, [k]: val}));
                      setErrors(er => ({...er, [k]: ""}));
                    }}
                    className={`h-9 bg-white/5 border-white/10 text-sm ${errors[k] ? "border-red-500" : ""}`}
                  />
                  {errors[k] && <p className="text-xs text-red-400">{errors[k]}</p>}
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save Vendor</Button>
            </div>
          </div>
        </div>
      )}

      {payVendor && <VendorPaymentModal vendor={payVendor} onClose={() => { setPayVendor(null); load(); base44.entities.VendorPayment.list("-created_date", 100).then(setPayments).catch(()=>{}); }} />}

      {/* Vendor Payment Configuration */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Payment Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Default Payment Method</Label>
            <select className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
              <option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Overdue Reminder (days)</Label>
            <input type="number" defaultValue="7" className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Auto-generate Receipt</Label>
            <div className="flex items-center gap-2 h-9">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-xs text-muted-foreground">Auto-generate on payment</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Bank Account Name</Label>
            <input defaultValue="Churi House Pvt. Ltd." className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bank Account Number</Label>
            <input defaultValue="XXXX XXXX 8821" className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">IFSC Code</Label>
            <input defaultValue="HDFC0001234" className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">UPI ID</Label>
            <input defaultValue="churihouse@hdfcbank" className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
          </div>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 glow-orange">Save Payment Config</Button>
      </div>

      {/* Payment Receipt History */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Payment Receipt History</h3>
          <span className="ml-auto text-xs text-muted-foreground">{payments.length} records</span>
        </div>
        {paymentsLoading ? <div className="p-8 text-center"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Vendor","Amount","Method","Reference","Date","Status"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments recorded yet.</td></tr> : payments.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium text-foreground">{p.vendor_name}</td>
                  <td className="p-4 font-bold text-primary">₹{(p.amount||0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground capitalize">{(p.payment_method||"—").replace("_"," ")}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{p.reference_number || "—"}</td>
                  <td className="p-4 text-muted-foreground">{p.paid_date || "—"}</td>
                  <td className="p-4"><span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}