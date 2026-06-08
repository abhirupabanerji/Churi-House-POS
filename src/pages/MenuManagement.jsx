import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useEntityQuery, useInvalidate } from "@/lib/useEntityQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ToggleLeft, ToggleRight, Pencil, Trash2, Settings2, Upload, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EditCategoriesModal from "@/components/menu/EditCategoriesModal";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const DEFAULT_CATEGORIES = ["Starters", "Main Course", "Biryani", "Breads", "Desserts", "Beverages"];
const LS_ALL_KEY = "menu_all_categories";
const COLOR_PALETTE = ["", "#ea580c", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

function loadAllCategories() {
  try {
    const stored = localStorage.getItem(LS_ALL_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [...DEFAULT_CATEGORIES];
}

// ── Bulk upload helpers ──────────────────────────────────────────────────────

function downloadMenuTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Category", "Price (₹)", "Prep Time (min)", "Card Color", "Vegetarian (yes/no)", "Available (yes/no)"],
    ["Paneer Tikka", "Starters", 180, 15, "#ea580c", "yes", "yes"],
    ["Chicken Biryani", "Biryani", 320, 25, "", "no", "yes"],
  ]);
  ws["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
  XLSX.writeFile(wb, "menu_template.xlsx");
}

function parseMenuFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const parsed = rows.map((row, i) => {
          const errors = [];
          const name = String(row["Name"] || "").trim();
          const category = String(row["Category"] || "").trim();
          const price = Number(row["Price (₹)"] || row["Price"] || 0);
          const prepTime = Number(row["Prep Time (min)"] || row["Prep Time"] || 0);
          const color = String(row["Card Color"] || "").trim();
          const isVeg = String(row["Vegetarian (yes/no)"] || row["Vegetarian"] || "yes").toLowerCase().trim() === "yes";
          const isAvailable = String(row["Available (yes/no)"] || row["Available"] || "yes").toLowerCase().trim() !== "no";

          if (!name) errors.push("Name is required");
          if (!price || price <= 0) errors.push("Valid price required");
          if (!category) errors.push("Category is required");

          return {
            _row: i + 2,
            _errors: errors,
            name, category, price, color,
            is_veg: isVeg,
            is_available: isAvailable,
            preparation_time: prepTime,
          };
        });
        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse file. Make sure it's a valid .xlsx or .csv"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsBinaryString(file);
  });
}

// ── Bulk Upload Modal ────────────────────────────────────────────────────────

function MenuBulkUploadModal({ onClose, onImported }) {
  const [step, setStep] = useState(1); // 1 = download template, 2 = upload, 3 = preview
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileError("");
    try {
      const parsed = await parseMenuFile(file);
      if (parsed.length === 0) { setFileError("No data rows found in file."); return; }
      setRows(parsed);
      setStep(3);
    } catch (err) {
      setFileError(err.message);
    }
  };

  const validRows = rows.filter(r => r._errors.length === 0);
  const invalidRows = rows.filter(r => r._errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      for (const row of validRows) {
        const { _row, _errors, ...data } = row;
        await base44.entities.MenuItem.create(data);
      }
      logAudit({ action: `Bulk import: ${validRows.length} menu items added`, type: "menu" });
      toast.success(`✅ ${validRows.length} items imported successfully.`);
      onImported();
      onClose();
    } catch (err) {
      toast.error("❌ Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Bulk Upload Menu Items</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {["Download Template", "Upload File", "Preview & Import"].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-primary text-white" : "bg-white/10 text-muted-foreground"}`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Download Template */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <p className="text-sm text-foreground font-medium">Step 1: Download the sample template</p>
              <p className="text-xs text-muted-foreground">The template contains all required columns. Fill it in and upload in the next step.</p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Columns included:</p>
                <p>Name, Category, Price (₹), Prep Time (min), Card Color, Vegetarian (yes/no), Available (yes/no)</p>
              </div>
            </div>
            <Button onClick={downloadMenuTemplate} className="w-full bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" /> Download Sample Template (.xlsx)
            </Button>
            <Button variant="outline" onClick={() => setStep(2)} className="w-full bg-white/5 border-white/10">
              Skip — I already have a file →
            </Button>
          </div>
        )}

        {/* Step 2 — Upload File */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <p className="text-sm text-foreground font-medium">Step 2: Upload your filled file</p>
              <p className="text-xs text-muted-foreground">Accepted formats: .xlsx, .csv</p>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to choose file or drag & drop</span>
              <span className="text-xs text-muted-foreground mt-1">.xlsx or .csv</span>
              <input type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFile} />
            </label>
            {fileError && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{fileError}</p>}
            <Button variant="outline" onClick={() => setStep(1)} className="w-full bg-white/5 border-white/10">
              ← Back
            </Button>
          </div>
        )}

        {/* Step 3 — Preview */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 glass rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Valid rows</p>
                  <p className="text-sm font-bold text-green-400">{validRows.length}</p>
                </div>
              </div>
              <div className="flex-1 glass rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Rows with errors</p>
                  <p className="text-sm font-bold text-red-400">{invalidRows.length}</p>
                </div>
              </div>
            </div>

            {/* Preview table */}
            <div className="glass rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background/80">
                  <tr className="border-b border-white/10">
                    <th className="text-left p-2 text-muted-foreground">Row</th>
                    <th className="text-left p-2 text-muted-foreground">Name</th>
                    <th className="text-left p-2 text-muted-foreground">Category</th>
                    <th className="text-left p-2 text-muted-foreground">Price</th>
                    <th className="text-left p-2 text-muted-foreground">Veg</th>
                    <th className="text-left p-2 text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-white/5 ${row._errors.length > 0 ? "bg-red-500/5" : "bg-green-500/5"}`}>
                      <td className="p-2 text-muted-foreground">{row._row}</td>
                      <td className="p-2 text-foreground">{row.name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.category || "—"}</td>
                      <td className="p-2 text-muted-foreground">₹{row.price}</td>
                      <td className="p-2">{row.is_veg ? "🟢" : "🔴"}</td>
                      <td className="p-2">
                        {row._errors.length === 0
                          ? <span className="text-green-400">✓ Valid</span>
                          : <span className="text-red-400" title={row._errors.join(", ")}>✗ {row._errors[0]}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                ⚠ {invalidRows.length} row(s) with errors will be skipped. Only {validRows.length} valid rows will be imported.
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setStep(2)}>← Back</Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
              >
                {importing ? "Importing..." : `Import ${validRows.length} Items`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MenuManagement() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Starters", price: "", is_veg: true, is_available: true, preparation_time: "", color: "" });
  const [editId, setEditId] = useState(null);
  const [allCategories, setAllCategories] = useState(loadAllCategories);
  const [showEditCats, setShowEditCats] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const { data: items = [], isLoading: loading } = useEntityQuery("MenuItem", { sort: "name", limit: 200 });
  const invalidate = useInvalidate();

  const filtered = items.filter((i) => {
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", category: allCategories[0], price: "", is_veg: true, is_available: true, preparation_time: "", color: "" });
    setDialogOpen(true);
  };

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
      logAudit({ action: `Menu item edited: ${data.name}`, type: "menu", details: `Price: ₹${old?.price} → ₹${data.price}` });
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
          <Button onClick={() => setShowEditCats(true)} variant="outline" className="bg-white/5 border-white/10 text-xs">
            <Settings2 className="w-3.5 h-3.5 mr-1" /> Edit Categories
          </Button>
          <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="bg-white/5 border-white/10 text-xs">
            <Upload className="w-3.5 h-3.5 mr-1" /> Bulk Upload
          </Button>
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1 flex-wrap">
          {["All", ...allCategories].map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-10 text-muted-foreground text-sm">No items found.</div>
          )}
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
                  {item.is_available
                    ? <ToggleRight className="w-8 h-8 text-green-500" />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
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
              <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors(e => ({ ...e, name: "" })); }} className={`bg-white/5 border-white/10 mt-1 ${formErrors.name ? "border-red-500" : ""}`} />
              {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price} onChange={(e) => { setForm({ ...form, price: e.target.value }); setFormErrors(e => ({ ...e, price: "" })); }} className={`bg-white/5 border-white/10 mt-1 ${formErrors.price ? "border-red-500" : ""}`} />
                {formErrors.price && <p className="text-xs text-red-400 mt-1">{formErrors.price}</p>}
              </div>
              <div>
                <Label>Prep Time (min)</Label>
                <Input type="number" value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
              </div>
            </div>
            <div>
              <Label>Card Color</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {COLOR_PALETTE.map(c => (
                  <button key={c || "none"} onClick={() => setForm({ ...form, color: c })} title={c || "No color"}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent hover:border-white/50"}`}
                    style={{ background: c || "rgba(255,255,255,0.08)" }}>
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <MenuBulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onImported={() => invalidate("MenuItem")}
        />
      )}

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