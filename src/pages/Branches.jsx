import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Store, MapPin, Phone, Plus, Pencil, Trash2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, nonNegativeNumber, positiveNumber, required } from "@/lib/formValidation";

const statusStyle = { active: "bg-green-500/10 text-green-400", inactive: "bg-red-500/10 text-red-400", maintenance: "bg-yellow-500/10 text-yellow-400" };

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", city: "", phone: "", franchise: "", manager_email: "", tables_count: 0, status: "active" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Branch.list("name", 50).then(d => { setBranches(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ name: "", code: "", address: "", city: "", phone: "", franchise: "", manager_email: "", tables_count: 0, status: "active" }); setShowForm(true); };
  const openEdit = (b) => { setEditing(b); setErrors({}); setForm({ name: b.name, code: b.code, address: b.address||"", city: b.city||"", phone: b.phone||"", franchise: b.franchise||"", manager_email: b.manager_email||"", tables_count: b.tables_count||0, status: b.status }); setShowForm(true); };
  const validate = () => {
    const next = {};
    required(next, "name", form.name);
    required(next, "code", form.code);
    required(next, "city", form.city);
    required(next, "manager_email", form.manager_email);
    required(next, "phone", form.phone);
    required(next, "tables_count", form.tables_count);
    positiveNumber(next, "tables_count", form.tables_count);
    if (form.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(form.phone.trim())) {
      next.phone = "Enter a valid phone number.";
    }
    if (form.manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email.trim())) {
      next.manager_email = "Enter a valid email address.";
    }
    console.log("Errors:", next, "Form:", form);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (editing) {
      await base44.entities.Branch.update(editing.id, form);
      toast.success(`✅ ${form.name} updated successfully.`);
    } else {
      await base44.entities.Branch.create(form);
      toast.success(`✅ ${form.name} added successfully.`);
    }
    setShowForm(false); load();
  };
  const remove = async (id) => {
    const b = branches.find(x => x.id === id);
    if (confirm("Delete branch?")) {
      await base44.entities.Branch.delete(id);
      toast.success(`🗑️ ${b?.name} permanently deleted.`);
      load();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Multi-Branch Management</h1><p className="text-sm text-muted-foreground">{branches.length} locations</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Branch</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        branches.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center"><Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground">No branches yet.</p><Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90">Add First Branch</Button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Store className="w-5 h-5 text-primary" /></div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[b.status]||""}`}>{b.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{b.name}</h3>
                <p className="text-xs text-muted-foreground">{b.code}</p>
                {b.city && <div className="flex items-center gap-1.5 mt-2"><MapPin className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{b.city}</span></div>}
                {b.phone && <div className="flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{b.phone}</span></div>}
                {b.tables_count > 0 && <div className="flex items-center gap-1.5 mt-1"><Users className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{b.tables_count} tables</span></div>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-white/5 border-white/10" onClick={() => openEdit(b)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(b.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing?"Edit":"New"} Branch</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              {[ ["name","Branch Name *"], ["code","Branch Code *"], ["franchise","Franchise Name"], ["city","City *"], ["address","Address"], ["phone","Phone *"], ["manager_email","Manager Email *"] ].map(([k,l]) => (
                <div key={k} className={`space-y-1.5 ${["address","manager_email","franchise"].includes(k)?"col-span-2":""}`}>
                  <Label className="text-xs">{l}</Label>
                  <Input value={form[k]} onChange={e=>{ setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                  {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
                </div>
              ))}
              <div className="space-y-1.5"><Label className="text-xs">Tables *</Label><Input type="number" value={form.tables_count} onChange={e=>{ setForm(f=>({...f,tables_count:e.target.value})); setErrors(er=>({...er,tables_count:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "tables_count") ? "border-red-500" : ""}`} />{fieldError(errors, "tables_count") && <p className="text-xs text-red-400">{fieldError(errors, "tables_count")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["active","inactive","maintenance"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save Branch</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}