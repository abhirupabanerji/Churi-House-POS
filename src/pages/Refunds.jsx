import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";

const statusStyle = { pending: "bg-yellow-500/10 text-yellow-400", approved: "bg-green-500/10 text-green-400", rejected: "bg-red-500/10 text-red-400" };

export default function Refunds() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ order_number: "", customer_name: "Walk-in", amount: 0, reason: "", method: "Cash", status: "pending" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Refund.list("-created_date", 50).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ order_number: "", customer_name: "Walk-in", amount: 0, reason: "", method: "Cash", status: "pending" }); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setErrors({}); setForm({ order_number: r.order_number, customer_name: r.customer_name, amount: r.amount, reason: r.reason, method: r.method, status: r.status }); setShowForm(true); };
  const validate = () => {
    const next = {};
    required(next, "order_number", form.order_number);
    required(next, "customer_name", form.customer_name);
    positiveNumber(next, "amount", form.amount);
    required(next, "reason", form.reason);
    required(next, "method", form.method);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => { if (!validate()) return; if (editing) await base44.entities.Refund.update(editing.id, form); else await base44.entities.Refund.create(form); setShowForm(false); load(); };
  const remove = async (id) => { if (confirm("Delete refund?")) { await base44.entities.Refund.delete(id); load(); } };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Refunds / Voids</h1><p className="text-sm text-muted-foreground">{items.length} records</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Refund</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center"><RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No refunds yet.</p></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["Order","Customer","Amount","Reason","Method","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-mono text-primary">{r.order_number}</td>
                    <td className="p-4 text-foreground">{r.customer_name}</td>
                    <td className="p-4 font-semibold text-red-400">₹{r.amount}</td>
                    <td className="p-4 text-muted-foreground">{r.reason}</td>
                    <td className="p-4 text-muted-foreground">{r.method}</td>
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
        )
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing?"Edit":"New"} Refund</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Order Number *</Label><Input value={form.order_number} onChange={e=>{ setForm(f=>({...f,order_number:e.target.value})); setErrors(er=>({...er,order_number:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "order_number") ? "border-red-500" : ""}`} />{fieldError(errors, "order_number") && <p className="text-xs text-red-400">{fieldError(errors, "order_number")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Customer *</Label><Input value={form.customer_name} onChange={e=>{ setForm(f=>({...f,customer_name:e.target.value})); setErrors(er=>({...er,customer_name:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "customer_name") ? "border-red-500" : ""}`} />{fieldError(errors, "customer_name") && <p className="text-xs text-red-400">{fieldError(errors, "customer_name")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Amount (?) *</Label><Input type="number" value={form.amount} onChange={e=>{ setForm(f=>({...f,amount:e.target.value})); setErrors(er=>({...er,amount:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "amount") ? "border-red-500" : ""}`} />{fieldError(errors, "amount") && <p className="text-xs text-red-400">{fieldError(errors, "amount")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Method</Label>
                <select value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["Cash","UPI","Card","Online"].map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Reason *</Label><Input value={form.reason} onChange={e=>{ setForm(f=>({...f,reason:e.target.value})); setErrors(er=>({...er,reason:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "reason") ? "border-red-500" : ""}`} />{fieldError(errors, "reason") && <p className="text-xs text-red-400">{fieldError(errors, "reason")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["pending","approved","rejected"].map(s=><option key={s} value={s}>{s}</option>)}
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