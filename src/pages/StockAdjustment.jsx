import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { SlidersHorizontal, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";

const typeStyle = { Received: "bg-green-500/10 text-green-400", Waste: "bg-red-500/10 text-red-400", Transfer: "bg-blue-500/10 text-blue-400", Correction: "bg-yellow-500/10 text-yellow-400" };

export default function StockAdjustment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_name: "", type: "Received", quantity: 0, unit: "kg", reason: "", by: "Admin", date: new Date().toISOString().split("T")[0] });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.StockAdjustmentRecord.list("-created_date", 50).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const validate = () => {
    const next = {};
    required(next, "item_name", form.item_name);
    required(next, "type", form.type);
    required(next, "unit", form.unit);
    positiveNumber(next, "quantity", form.quantity);
    required(next, "date", form.date);
    required(next, "reason", form.reason);
    required(next, "by", form.by);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => { if (!validate()) return; await base44.entities.StockAdjustmentRecord.create(form); setShowForm(false); load(); };
  const remove = async (id) => { await base44.entities.StockAdjustmentRecord.delete(id); load(); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Stock Adjustment</h1><p className="text-sm text-muted-foreground">Manual stock corrections</p></div>
        <Button onClick={() => { setErrors({}); setShowForm(true); }} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Adjustment</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center"><SlidersHorizontal className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No adjustments yet.</p></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["Item","Type","Qty","Reason","Date","By",""].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-medium text-foreground">{a.item_name}</td>
                    <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeStyle[a.type]}`}>{a.type}</span></td>
                    <td className={`p-4 font-semibold ${a.type === "Received" ? "text-green-400" : "text-red-400"}`}>{a.type==="Received"?"+":"-"}{a.quantity} {a.unit}</td>
                    <td className="p-4 text-muted-foreground">{a.reason}</td>
                    <td className="p-4 text-muted-foreground">{a.date}</td>
                    <td className="p-4 text-muted-foreground">{a.by}</td>
                    <td className="p-4"><Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(a.id)}><Trash2 className="w-3 h-3" /></Button></td>
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
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">New Stock Adjustment</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Item Name *</Label><Input value={form.item_name} onChange={e=>{ setForm(f=>({...f,item_name:e.target.value})); setErrors(er=>({...er,item_name:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "item_name") ? "border-red-500" : ""}`} />{fieldError(errors, "item_name") && <p className="text-xs text-red-400">{fieldError(errors, "item_name")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["Received","Waste","Transfer","Correction"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Unit</Label>
                <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["kg","L","pcs","box","dozen"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Quantity *</Label><Input type="number" value={form.quantity} onChange={e=>{ setForm(f=>({...f,quantity:e.target.value})); setErrors(er=>({...er,quantity:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "quantity") ? "border-red-500" : ""}`} />{fieldError(errors, "quantity") && <p className="text-xs text-red-400">{fieldError(errors, "quantity")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={form.date} onChange={e=>{ setForm(f=>({...f,date:e.target.value})); setErrors(er=>({...er,date:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "date") ? "border-red-500" : ""}`} />{fieldError(errors, "date") && <p className="text-xs text-red-400">{fieldError(errors, "date")}</p>}</div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Reason *</Label><Input value={form.reason} onChange={e=>{ setForm(f=>({...f,reason:e.target.value})); setErrors(er=>({...er,reason:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "reason") ? "border-red-500" : ""}`} />{fieldError(errors, "reason") && <p className="text-xs text-red-400">{fieldError(errors, "reason")}</p>}</div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Recorded By *</Label><Input value={form.by} onChange={e=>{ setForm(f=>({...f,by:e.target.value})); setErrors(er=>({...er,by:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "by") ? "border-red-500" : ""}`} />{fieldError(errors, "by") && <p className="text-xs text-red-400">{fieldError(errors, "by")}</p>}</div>
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