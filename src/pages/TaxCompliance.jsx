import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";

const statusStyle = { pending: "bg-yellow-500/10 text-yellow-400", filed: "bg-green-500/10 text-green-400", paid: "bg-blue-500/10 text-blue-400" };

export default function TaxCompliance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ period: "", taxable_amount: 0, cgst_rate: 2.5, sgst_rate: 2.5, cgst_amount: 0, sgst_amount: 0, total_tax: 0, status: "pending", notes: "" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.TaxRecord.list("-created_date", 50).then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const calcTax = (f) => {
    const cgst = Math.round(f.taxable_amount * f.cgst_rate / 100);
    const sgst = Math.round(f.taxable_amount * f.sgst_rate / 100);
    return { ...f, cgst_amount: cgst, sgst_amount: sgst, total_tax: cgst + sgst };
  };
  const upd = (k, v) => setForm(f => calcTax({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setErrors({}); setForm(calcTax({ period: new Date().toLocaleString("default",{month:"long"})+" "+new Date().getFullYear(), taxable_amount: 0, cgst_rate: 2.5, sgst_rate: 2.5, cgst_amount: 0, sgst_amount: 0, total_tax: 0, status: "pending", notes: "" })); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setErrors({}); setForm({ period: r.period, taxable_amount: r.taxable_amount||0, cgst_rate: r.cgst_rate||2.5, sgst_rate: r.sgst_rate||2.5, cgst_amount: r.cgst_amount||0, sgst_amount: r.sgst_amount||0, total_tax: r.total_tax||0, status: r.status, notes: r.notes||"" }); setShowForm(true); };
  const validate = () => {
    const next = {};
    required(next, "period", form.period);
    positiveNumber(next, "taxable_amount", form.taxable_amount);
    required(next, "status", form.status);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => { if (!validate()) return; if (editing) await base44.entities.TaxRecord.update(editing.id, form); else await base44.entities.TaxRecord.create(form); setShowForm(false); load(); };
  const remove = async (id) => { if (confirm("Delete record?")) { await base44.entities.TaxRecord.delete(id); load(); } };

  const totalPending = records.filter(r => r.status === "pending").reduce((s, r) => s + (r.total_tax || 0), 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + (r.total_tax || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Tax &amp; Compliance</h1><p className="text-sm text-muted-foreground">GST reports and filings</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Record</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["GST Rate","5%","text-foreground"],[`Pending Tax`,`₹${totalPending.toLocaleString()}`,"text-yellow-400"],[`YTD Tax Paid`,`₹${totalPaid.toLocaleString()}`,"text-primary"]].map(([l,v,c])=>(
          <div key={l} className="glass rounded-2xl p-5 text-center"><p className="text-xs text-muted-foreground mb-1">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Period","Taxable Amt","CGST","SGST","Total Tax","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {records.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No tax records. Add your first entry.</td></tr> : records.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium text-foreground">{r.period}</td>
                  <td className="p-4 text-muted-foreground">₹{(r.taxable_amount||0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">₹{(r.cgst_amount||0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">₹{(r.sgst_amount||0).toLocaleString()}</td>
                  <td className="p-4 font-semibold text-primary">₹{(r.total_tax||0).toLocaleString()}</td>
                  <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[r.status]}`}>{r.status}</span></td>
                  <td className="p-4 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10" onClick={() => openEdit(r)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing?"Edit":"New"} Tax Record</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Period *</Label><Input value={form.period} onChange={e=>{ setForm(f=>({...f,period:e.target.value})); setErrors(er=>({...er,period:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "period") ? "border-red-500" : ""}`} placeholder="e.g. May 2026" />{fieldError(errors, "period") && <p className="text-xs text-red-400">{fieldError(errors, "period")}</p>}</div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Taxable Amount (?) *</Label><Input type="number" value={form.taxable_amount} onChange={e=>{ upd("taxable_amount",e.target.value); setErrors(er=>({...er,taxable_amount:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "taxable_amount") ? "border-red-500" : ""}`} />{fieldError(errors, "taxable_amount") && <p className="text-xs text-red-400">{fieldError(errors, "taxable_amount")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">CGST % (auto)</Label><Input readOnly value={form.cgst_amount} className="h-9 bg-white/5 border-white/10 text-sm opacity-60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">SGST % (auto)</Label><Input readOnly value={form.sgst_amount} className="h-9 bg-white/5 border-white/10 text-sm opacity-60" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Total Tax</Label><Input readOnly value={form.total_tax} className="h-9 bg-primary/10 border-primary/20 text-sm font-bold text-primary" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["pending","filed","paid"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}