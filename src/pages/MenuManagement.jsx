import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useEntityQuery, useInvalidate } from "@/lib/useEntityQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ToggleLeft, ToggleRight, Pencil, Trash2, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EditCategoriesModal from "@/components/menu/EditCategoriesModal";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = ["Starters", "Main Course", "Biryani", "Breads", "Desserts", "Beverages"];
const LS_ALL_KEY = "menu_all_categories";

const COLOR_PALETTE = [
  "", "#ea580c", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function loadAllCategories() {
  try {
    const stored = localStorage.getItem(LS_ALL_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* noop */ }
  return [...DEFAULT_CATEGORIES];
}

export default function MenuManagement() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Starters", price: "", is_veg: true, is_available: true, preparation_time: "", color: "" });
  const [editId, setEditId] = useState(null);
  const [allCategories, setAllCategories] = useState(loadAllCategories);
  const [showEditCats, setShowEditCats] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const { data: items = [], isLoading: loading } = useEntityQuery("MenuItem", { sort: "name", limit: 200 });
  const invalidate = useInvalidate();

  const filtered = items.filter((i) => {
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setEditId(null); setForm({ name: "", category: allCategories[0], price: "", is_veg: true, is_available: true, preparation_time: "", color: "" }); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ name: item.name, category: item.category, price: String(item.price), is_veg: item.is_veg ?? true, is_available: item.is_available ?? true, preparation_time: String(item.preparation_time || ""), color: item.color || "" });
    setDialogOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Item name is required.";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errs.price = "Valid price is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const data = { ...form, price: Number(form.price), preparation_time: Number(form.preparation_time) || 0 };
    if (editId) {
      const old = items.find(i => i.id === editId);
      await base44.entities.MenuItem.update(editId, data);
      logAudit({ action: `Menu item edited: ${data.name}`, type: "menu", details: `Price: ₹${old?.price} → ₹${data.price}, Category: ${old?.category} → ${data.category}` });
      toast.success(`✅ ${data.name} updated successfully.`);
    } else {
      await base44.entities.MenuItem.create(data);
      logAudit({ action: `Menu item added: ${data.name}`, type: "menu", details: `Category: ${data.category}, Price: ₹${data.price}` });
      toast.success(`✅ ${data.name} added successfully.`);
    }
    invalidate("MenuItem");
    setDialogOpen(false);
  };

  const toggleAvailability = async (item) => {
    await base44.entities.MenuItem.update(item.id, { is_available: !item.is_available });
    invalidate("MenuItem");
    logAudit({ action: `Menu item ${!item.is_available ? "marked available" : "marked unavailable"}: ${item.name}`, type: "menu" });
    toast.success(`✅ ${item.name} marked ${!item.is_available ? "available" : "unavailable"}.`);
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await softDelete({ module: "MenuItem", id: item.id, name: item.name, data: item });
    await base44.entities.MenuItem.delete(item.id);
    invalidate("MenuItem");
    logAudit({ action: `Menu item deleted: ${item.name}`, type: "menu", details: `Category: ${item.category}, Price: ₹${item.price}` });
    toast.success(`🗑️ ${item.name} moved to Recycle Bin.`);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-sm text-muted-foreground">{items?.length ?? 0} items</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEditCats(true)} variant="outline" className="bg-white/5 border-white/10 text-xs"><Settings2 className="w-3.5 h-3.5 mr-1" /> Edit Categories</Button>
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1 flex-wrap">
          {["All", ...allCategories].map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id}
              className={`rounded-2xl p-5 transition-all border ${!item.is_available ? "opacity-50" : "hover:glow-orange"}`}
              style={item.color
                ? { background: `${item.color}22`, borderColor: `${item.color}55`, borderWidth: "1px", borderStyle: "solid" }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", borderWidth: "1px", borderStyle: "solid" }
              }>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm border-2 ${item.is_veg ? "border-green-500" : "border-red-500"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full m-auto mt-0.5 ${item.is_veg ? "bg-green-500" : "bg-red-500"}`} />
                  </div>
                  {item.color && <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: item.color }} />}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-white/10"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.category}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-primary">₹{item.price}</span>
                <button onClick={() => toggleAvailability(item)}>
                  {item.is_available ? <ToggleRight className="w-8 h-8 text-green-500" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editId ? "Edit Item" : "Add Menu Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors(e => ({...e, name: ""})); }} className={`bg-white/5 border-white/10 mt-1 ${formErrors.name ? "border-red-500" : ""}`} />
              {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
            </div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price} onChange={(e) => { setForm({ ...form, price: e.target.value }); setFormErrors(e => ({...e, price: ""})); }} className={`bg-white/5 border-white/10 mt-1 ${formErrors.price ? "border-red-500" : ""}`} />
                {formErrors.price && <p className="text-xs text-red-400 mt-1">{formErrors.price}</p>}
              </div>
              <div><Label>Prep Time (min)</Label><Input type="number" value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
            </div>
            <div>
              <Label>Card Color</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c || "none"}
                    onClick={() => setForm({ ...form, color: c })}
                    title={c || "No color"}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent hover:border-white/50"}`}
                    style={{ background: c || "rgba(255,255,255,0.08)" }}
                  >
                    {!c && <span className="text-[10px] text-muted-foreground">✕</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_veg} onCheckedChange={(v) => setForm({ ...form, is_veg: v })} /><Label>Vegetarian</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} /><Label>Available</Label></div>
            </div>
            <Button onClick={save} className="w-full bg-primary hover:bg-primary/90 glow-orange">{editId ? "Update" : "Add Item"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Categories Modal */}
      {showEditCats && (
        <EditCategoriesModal
          onClose={() => setShowEditCats(false)}
          menuItems={items}
          onCategoriesChanged={() => {
            try {
              const stored = localStorage.getItem(LS_ALL_KEY);
              if (stored) setAllCategories(JSON.parse(stored));
            } catch {}
          }}
        />
      )}
    </div>
  );
}