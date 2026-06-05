import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Package, AlertTriangle, Plus, Pencil, Trash2, X } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { softDelete } from "@/lib/softDelete";
import { useEntityQuery, useInvalidate } from "@/lib/useEntityQuery";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fieldError, nonNegativeNumber, required } from "@/lib/formValidation";

const statusStyle = { ok: "bg-green-500/10 text-green-400", low: "bg-yellow-500/10 text-yellow-400", critical: "bg-red-500/10 text-red-400" };

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "kg", stock: 0, min_level: 5, cost_per_unit: 0, category: "Produce" });
  const [errors, setErrors] = useState({});

  const { data: items = [], isLoading: loading } = useEntityQuery("InventoryItem", { sort: "name", limit: 100 });
  const invalidate = useInvalidate();
  const load = () => invalidate("InventoryItem");

  const getStatus = (item) => item.stock <= 0 ? "critical" : item.stock < item.min_level ? (item.stock < item.min_level / 2 ? "critical" : "low") : "ok";
  const categories = ["All", ...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = items.filter(i => {
    const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || i.category === categoryFilter;
    const status = getStatus(i);
    const matchStatus = statusFilter === "All" || (statusFilter === "ok" && status === "ok") || (statusFilter === "low" && status === "low") || (statusFilter === "critical" && status === "critical");
    return matchSearch && matchCat && matchStatus;
  });
  const lowCount = items.filter(i => getStatus(i) !== "ok").length;

  const openNew = () => { setEditing(null); setErrors({}); setForm({ name: "", unit: "kg", stock: 0, min_level: 5, cost_per_unit: 0, category: "Produce" }); setShowForm(true); };
  const openEdit = (i) => { setEditing(i); setErrors({}); setForm({ name: i.name, unit: i.unit, stock: i.stock, min_level: i.min_level, cost_per_unit: i.cost_per_unit||0, category: i.category||"Produce" }); setShowForm(true); };
  const validate = () => {
    const next = {};
    required(next, "name", form.name);
    required(next, "category", form.category);
    required(next, "unit", form.unit);
    nonNegativeNumber(next, "stock", form.stock);
    nonNegativeNumber(next, "min_level", form.min_level);
    nonNegativeNumber(next, "cost_per_unit", form.cost_per_unit);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (editing) {
      await base44.entities.InventoryItem.update(editing.id, form);
      logAudit({ action: `Inventory updated: ${form.name}`, type: "inventory", details: `Stock: ${editing.stock}→${form.stock} ${form.unit}` });
      toast.success(`✅ ${form.name} updated successfully.`);
    } else {
      await base44.entities.InventoryItem.create(form);
      logAudit({ action: `Inventory item added: ${form.name}`, type: "inventory", details: `Stock: ${form.stock} ${form.unit}` });
      toast.success(`✅ ${form.name} added successfully.`);
    }
    setShowForm(false);
    invalidate("InventoryItem");
  };
  const remove = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item || !confirm(`Delete "${item.name}"?`)) return;
    await softDelete({ module: "InventoryItem", id: item.id, name: item.name, data: item });
    await base44.entities.InventoryItem.delete(id);
    logAudit({ action: `Inventory item deleted: ${item.name}`, type: "inventory", details: `Stock: ${item.stock} ${item.unit}` });
    toast.success(`🗑️ ${item.name} moved to Recycle Bin.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Inventory</h1><p className="text-sm text-muted-foreground">{items.length} items tracked</p></div>
        <div className="flex items-center gap-3">
          {lowCount > 0 && <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20"><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-xs text-red-400 font-medium">{lowCount} low</span></div>}
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-white/5 border-white/10 w-64" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
          <option value="All">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Ingredient","Category","Stock","Min Level","Cost/Unit","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No items yet. Add your first item.</td></tr> : filtered.map(item => {
                const s = getStatus(item);
                return (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /><span className="font-medium text-foreground">{item.name}</span></td>
                    <td className="p-4 text-muted-foreground">{item.category}</td>
                    <td className="p-4 text-foreground">{item.stock} {item.unit}</td>
                    <td className="p-4 text-muted-foreground">{item.min_level} {item.unit}</td>
                    <td className="p-4 text-muted-foreground">₹{item.cost_per_unit||0}</td>
                    <td className="p-4"><span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle[s]}`}>{s === "critical" ? "Critical" : s === "low" ? "Low Stock" : "In Stock"}</span></td>
                    <td className="p-4 flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(item.id)}><Trash2 className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing?"Edit":"Add"} Inventory Item</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Item Name *</Label>
                <Input value={form.name} onChange={e=>{ setForm(f=>({...f,name:e.target.value})); setErrors(er=>({...er,name:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "name") ? "border-red-500" : ""}`} />
                {fieldError(errors, "name") && <p className="text-xs text-red-400">{fieldError(errors, "name")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <select value={form.category} onChange={e=>{ setForm(f=>({...f,category:e.target.value})); setErrors(er=>({...er,category:""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "category") ? "border-red-500" : "border-white/10"}`}>
                  {["Produce","Meat","Dairy","Spices","Beverages","Dry Goods","Packaging"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {fieldError(errors, "category") && <p className="text-xs text-red-400">{fieldError(errors, "category")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit *</Label>
                <select value={form.unit} onChange={e=>{ setForm(f=>({...f,unit:e.target.value})); setErrors(er=>({...er,unit:""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "unit") ? "border-red-500" : "border-white/10"}`}>
                  {["kg","L","pcs","box","dozen","g","ml"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                {fieldError(errors, "unit") && <p className="text-xs text-red-400">{fieldError(errors, "unit")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Stock *</Label>
                <Input type="number" value={form.stock} onChange={e=>{ setForm(f=>({...f,stock:e.target.value})); setErrors(er=>({...er,stock:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "stock") ? "border-red-500" : ""}`} />
                {fieldError(errors, "stock") && <p className="text-xs text-red-400">{fieldError(errors, "stock")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Level *</Label>
                <Input type="number" value={form.min_level} onChange={e=>{ setForm(f=>({...f,min_level:e.target.value})); setErrors(er=>({...er,min_level:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "min_level") ? "border-red-500" : ""}`} />
                {fieldError(errors, "min_level") && <p className="text-xs text-red-400">{fieldError(errors, "min_level")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost per Unit (?) *</Label>
                <Input type="number" value={form.cost_per_unit} onChange={e=>{ setForm(f=>({...f,cost_per_unit:e.target.value})); setErrors(er=>({...er,cost_per_unit:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "cost_per_unit") ? "border-red-500" : ""}`} />
                {fieldError(errors, "cost_per_unit") && <p className="text-xs text-red-400">{fieldError(errors, "cost_per_unit")}</p>}
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