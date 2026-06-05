import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gift, Plus, Pencil, Trash2, X } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSession } from "@/lib/restaurantAuth";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";

const BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];

export default function Combos() {
  const session = getSession();
  const isOwner = !session || session.role === "super_admin" || session.role === "admin";

  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [itemInput, setItemInput] = useState("");
  const [form, setForm] = useState({ name: "", description: "", items: [], price: 0, original_price: 0, status: "active", branch_ids: [...BRANCHES] });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Combo.list("-created_date", 100).then(d => { setCombos(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { if (isOwner) load(); else setLoading(false); }, []);

  if (!isOwner) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center"><Gift className="w-8 h-8 text-muted-foreground" /></div>
        <h2 className="text-xl font-semibold text-foreground">Owner Access Only</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">Combos and Meal Deals can only be managed by the owner or super admin.</p>
      </div>
    );
  }

  const openNew = () => { setEditing(null); setErrors({}); setItemInput(""); setForm({ name: "", description: "", items: [], price: 0, original_price: 0, status: "active", branch_ids: [...BRANCHES] }); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setErrors({}); setItemInput(""); setForm({ name: c.name, description: c.description||"", items: c.items||[], price: c.price, original_price: c.original_price||0, status: c.status, branch_ids: c.branch_ids||[...BRANCHES] }); setShowForm(true); };
  const addItem = () => { if (itemInput.trim()) { setForm(f => ({...f, items: [...f.items, itemInput.trim()]})); setItemInput(""); } };
  const removeItem = (i) => setForm(f => ({...f, items: f.items.filter((_,idx) => idx !== i)}));
  const toggleBranch = (b) => setForm(f => ({ ...f, branch_ids: f.branch_ids.includes(b) ? f.branch_ids.filter(x => x !== b) : [...f.branch_ids, b] }));
  const validate = () => {
    const next = {};
    required(next, "name", form.name);
    positiveNumber(next, "price", form.price);
    if (!form.items.length) next.items = "Add at least one item";
    if (!form.branch_ids?.length) next.branch_ids = "Select at least one branch";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (editing) {
      await base44.entities.Combo.update(editing.id, form);
      logAudit({ action: `Combo updated: ${form.name}`, type: "menu", details: `Price: ₹${form.price}` });
      toast.success(`✅ ${form.name} updated successfully.`);
    } else {
      await base44.entities.Combo.create(form);
      logAudit({ action: `Combo created: ${form.name}`, type: "menu", details: `Price: ₹${form.price}` });
      toast.success(`✅ ${form.name} added successfully.`);
    }
    setShowForm(false); load();
  };
  const remove = async (id) => {
    const c = combos.find(x => x.id === id);
    if (confirm("Delete combo?")) {
      await base44.entities.Combo.delete(id);
      logAudit({ action: `Combo deleted: ${c?.name}`, type: "menu" });
      toast.success(`🗑️ ${c?.name} permanently deleted.`);
      load();
    }
  };
  const toggleStatus = async (c) => {
    const ns = c.status === "active" ? "inactive" : "active";
    await base44.entities.Combo.update(c.id, { status: ns });
    logAudit({ action: `Combo ${ns}: ${c.name}`, type: "menu" });
    toast.success(`✅ ${c.name} marked ${ns}.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Combos / Meal Deals</h1><p className="text-sm text-muted-foreground">{combos.filter(c=>c.status==="active").length} active combos</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Combo</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        combos.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No combos yet.</p>
            <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Combo</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {combos.map(c => (
              <div key={c.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Gift className="w-5 h-5 text-primary" /></div>
                  <Switch checked={c.status === "active"} onCheckedChange={() => toggleStatus(c)} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                <ul className="mt-2 space-y-0.5">{(c.items||[]).map(i => <li key={i} className="text-xs text-muted-foreground">• {i}</li>)}</ul>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xl font-bold text-primary">₹{c.price}</p>
                  {c.original_price > 0 && <p className="text-xs text-muted-foreground line-through">₹{c.original_price}</p>}
                </div>
                {c.branch_ids?.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">{c.branch_ids.length} branches active</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-white/5 border-white/10" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => remove(c.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Combo" : "New Combo"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              {[["name","Combo Name"],["description","Description"]].map(([k,l]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs">{l}</Label>
                  <Input value={form[k]} onChange={e => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                  {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[["price","Price"],["original_price","Original Price"]].map(([k,l]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs">{l}</Label>
                    <Input type="number" value={form[k]} onChange={e => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                    {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Items</Label>
                <div className="flex gap-2">
                  <Input value={itemInput} onChange={e => setItemInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} className="h-9 bg-white/5 border-white/10 text-sm" placeholder="Add item..." />
                  <Button size="sm" onClick={addItem} className="h-9 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.items.map((item, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {item} <button onClick={() => removeItem(i)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Active at Branches</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BRANCHES.map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.branch_ids?.includes(b)} onChange={() => { toggleBranch(b); setErrors(er => ({...er, branch_ids: ""})); }} className="accent-orange-500" />
                      <span className="text-xs text-foreground">{b}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save Combo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}