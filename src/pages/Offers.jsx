import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tag, Plus, Pencil, Trash2, X } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSession } from "@/lib/restaurantAuth";
import { fieldError, nonNegativeNumber, positiveNumber, required } from "@/lib/formValidation";

const BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];
const TYPES = ["percentage","flat","bogo","time_based","coupon"];
const typeLabel = { percentage: "% Off", flat: "Flat Off", bogo: "Buy 1 Get 1", time_based: "Time-Based", coupon: "Coupon" };

export default function Offers() {
  const session = getSession();
  const isOwner = !session || session.role === "super_admin" || session.role === "admin";

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", offer_type: "percentage", discount_value: 0, min_order_value: 0, valid_from_time: "", valid_to_time: "", status: "active", branch_ids: [...BRANCHES] });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Offer.list("-created_date", 100).then(d => { setOffers(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { if (isOwner) load(); else setLoading(false); }, []);

  if (!isOwner) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center"><Tag className="w-8 h-8 text-muted-foreground" /></div>
        <h2 className="text-xl font-semibold text-foreground">Owner Access Only</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">Offers and Discounts can only be managed by the owner or super admin.</p>
      </div>
    );
  }

  const openNew = () => { setEditing(null); setErrors({}); setForm({ name: "", description: "", offer_type: "percentage", discount_value: 0, min_order_value: 0, valid_from_time: "", valid_to_time: "", status: "active", branch_ids: [...BRANCHES] }); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setErrors({}); setForm({ name: o.name, description: o.description||"", offer_type: o.offer_type||"percentage", discount_value: o.discount_value||0, min_order_value: o.min_order_value||0, valid_from_time: o.valid_from_time||"", valid_to_time: o.valid_to_time||"", status: o.status, branch_ids: o.branch_ids||[...BRANCHES] }); setShowForm(true); };
  const toggleBranch = (b) => setForm(f => ({ ...f, branch_ids: f.branch_ids.includes(b) ? f.branch_ids.filter(x => x !== b) : [...f.branch_ids, b] }));
  const validate = () => {
    const next = {};
    required(next, "name", form.name);
    required(next, "offer_type", form.offer_type);
    positiveNumber(next, "discount_value", form.discount_value);
    nonNegativeNumber(next, "min_order_value", form.min_order_value);
    if (!form.branch_ids?.length) next.branch_ids = "Select at least one branch";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    if (editing) {
      await base44.entities.Offer.update(editing.id, form);
      logAudit({ action: `Offer updated: ${form.name}`, type: "menu", details: `Type: ${form.offer_type}` });
      toast.success(`✅ ${form.name} updated successfully.`);
    } else {
      await base44.entities.Offer.create(form);
      logAudit({ action: `Offer created: ${form.name}`, type: "menu", details: `Type: ${form.offer_type}` });
      toast.success(`✅ ${form.name} added successfully.`);
    }
    setSaving(false); setShowForm(false); load();
  };
  const remove = async (id) => {
    const o = offers.find(x => x.id === id);
    if (confirm("Delete offer?")) {
      await base44.entities.Offer.delete(id);
      logAudit({ action: `Offer deleted: ${o?.name}`, type: "menu" });
      toast.success(`🗑️ ${o?.name} permanently deleted.`);
      load();
    }
  };
  const toggleStatus = async (o) => {
    const ns = o.status === "active" ? "inactive" : "active";
    await base44.entities.Offer.update(o.id, { status: ns });
    logAudit({ action: `Offer ${ns}: ${o.name}`, type: "menu" });
    toast.success(`✅ ${o.name} marked ${ns}.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">{"Offers & Discounts"}</h1><p className="text-sm text-muted-foreground">{offers.filter(o=>o.status==="active").length} active offers</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Offer</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        offers.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No offers yet.</p>
            <Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Add Offer</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {offers.map(o => (
              <div key={o.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
                  <Switch checked={o.status === "active"} onCheckedChange={() => toggleStatus(o)} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{o.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">{typeLabel[o.offer_type] || o.offer_type}</span>
                  {o.discount_value > 0 && <span className="text-sm font-bold text-primary">{o.offer_type === "percentage" ? `${o.discount_value}%` : `₹${o.discount_value}`}</span>}
                </div>
                {o.valid_from_time && <p className="text-[10px] text-muted-foreground mt-1">{o.valid_from_time} – {o.valid_to_time}</p>}
                {o.branch_ids?.length > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{o.branch_ids.length} branches</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-white/5 border-white/10" onClick={() => openEdit(o)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => remove(o.id)}><Trash2 className="w-3 h-3" /></Button>
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
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Offer" : "New Offer"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              {[["name","Offer Name"],["description","Description"]].map(([k,l]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs">{l}</Label>
                  <Input value={form[k]} onChange={e => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                  {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <select value={form.offer_type} onChange={e => setForm(f => ({...f, offer_type: e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                    {TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount Value</Label>
                  <Input type="number" value={form.discount_value} onChange={e => { setForm(f => ({...f, discount_value: e.target.value})); setErrors(er => ({...er,discount_value:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "discount_value") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "discount_value") && <p className="text-xs text-red-400">{fieldError(errors, "discount_value")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">From Time</Label>
                  <Input type="time" value={form.valid_from_time} onChange={e => setForm(f => ({...f, valid_from_time: e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To Time</Label>
                  <Input type="time" value={form.valid_to_time} onChange={e => setForm(f => ({...f, valid_to_time: e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Active at Branches</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BRANCHES.map(b => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.branch_ids?.includes(b)} onChange={() => { toggleBranch(b); setErrors(er => ({...er,branch_ids:""})); }} className="accent-orange-500" />
                      <span className="text-xs text-foreground">{b}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Offer"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}