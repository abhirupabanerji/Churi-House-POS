import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { fieldError, positiveNumber } from "@/lib/formValidation";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";

const STATUSES = ["available", "occupied", "reserved", "cleaning"];

const statusStyle = {
  available: "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20",
  occupied:  "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
  reserved:  "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20",
  cleaning:  "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20",
};

const defaultTables = Array.from({ length: 20 }, (_, i) => ({
  num: i + 1,
  capacity: [2, 2, 4, 4, 6, 6, 8][i % 7],
  status: ["available", "occupied", "occupied", "reserved", "available"][i % 5],
  label: "",
}));

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ num: "", capacity: 4, label: "" });
  const [addErrors, setAddErrors] = useState({});

  const load = () => {
    base44.entities.Table.list("num", 200)
      .then(async (rows) => {
        // First-time seed: if no tables exist yet, create the defaults
        if (rows.length === 0) {
          const created = await Promise.all(defaultTables.map(t => base44.entities.Table.create(t)));
          setTables(created.sort((a, b) => a.num - b.num));
        } else {
          setTables(rows.sort((a, b) => a.num - b.num));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Sync reserved tables from Reservations entity
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    base44.entities.Reservation.filter({ status: "confirmed", date: today })
      .then(confirmed => {
        if (!confirmed.length) return;
        confirmed.forEach(r => {
          if (r.table_number) {
            setTables(prev => prev.map(t => {
              if (String(t.num) === String(r.table_number) && t.status === "available") {
                const updated = { ...t, status: "reserved", label: `Res: ${r.guest_name}` };
                base44.entities.Table.update(t.id, { status: "reserved", label: `Res: ${r.guest_name}` }).catch(() => {});
                return updated;
              }
              return t;
            }));
          }
        });
      }).catch(() => {});

    const unsub = base44.entities.Reservation.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        const r = event.data;
        if (r.status === "confirmed" && r.table_number) {
          setTables(prev => prev.map(t => {
            if (String(t.num) === String(r.table_number) && t.status === "available") {
              base44.entities.Table.update(t.id, { status: "reserved", label: `Res: ${r.guest_name}` }).catch(() => {});
              return { ...t, status: "reserved", label: `Res: ${r.guest_name}` };
            }
            return t;
          }));
        }
      }
    });
    return unsub;
  }, []);

  const updateTable = async (id, changes) => {
    await base44.entities.Table.update(id, changes).catch(() => {});
    setTables(ts => ts.map(t => t.id === id ? { ...t, ...changes } : t));
  };

  const deleteTable = async (table) => {
    if (!confirm(`Delete Table ${table.num}?`)) return;
    try {
      await softDelete({
        module: "Table",
        id: table.id,
        name: `Table-${table.num}`,
        data: table,
      });
      await base44.entities.Table.delete(table.id);
      logAudit({
        action: `Table deleted: Table-${table.num}`,
        type: "admin",
        details: `Capacity: ${table.capacity} | Status: ${table.status}${table.label ? ` | Label: ${table.label}` : ""}`,
      });
      toast.success(`🗑️ Table ${table.num} moved to Recycle Bin.`);
      setTables(ts => ts.filter(t => t.id !== table.id));
      setSelected(null);
    } catch (err) {
      toast.error("Failed to delete table.");
      console.error(err);
    }
  };

  const validateAddTable = () => {
    const next = {};
    positiveNumber(next, "num", addForm.num);
    positiveNumber(next, "capacity", addForm.capacity);
    setAddErrors(next);
    return Object.keys(next).length === 0;
  };

  const addTable = async () => {
    if (!validateAddTable()) return;
    try {
      const created = await base44.entities.Table.create({
        num: Number(addForm.num),
        capacity: Number(addForm.capacity),
        status: "available",
        label: addForm.label,
      });
      setTables(ts => [...ts, created].sort((a, b) => a.num - b.num));
      setAddForm({ num: "", capacity: 4, label: "" });
      setShowAdd(false);
    } catch (err) {
      toast.error("Failed to add table.");
      console.error(err);
    }
  };

  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: tables.filter(t => t.status === s).length }), {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
          <p className="text-sm text-muted-foreground">{tables.length} tables</p>
        </div>
        <Button onClick={() => { setAddErrors({}); setShowAdd(true); }} className="bg-primary hover:bg-primary/90 glow-orange">
          <Plus className="w-4 h-4 mr-1" /> Add Table
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {STATUSES.map(s => (
          <span key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusStyle[s]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {s} <span className="opacity-60">({counts[s]})</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-5 xl:grid-cols-8 gap-3">
          {tables.map(t => (
            <div key={t.id} onClick={() => setSelected({ ...t })}
              className={`glass rounded-2xl p-4 text-center border cursor-pointer transition-all ${statusStyle[t.status]}`}>
              <p className="text-lg font-bold">{t.num}</p>
              <p className="text-[10px] opacity-70">{t.capacity} seats</p>
              {t.label && <p className="text-[9px] mt-0.5 opacity-60 truncate">{t.label}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Table Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Table {selected.num}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Table Number</Label>
                <Input type="number" value={selected.num}
                  onChange={e => setSelected(v => ({ ...v, num: Number(e.target.value) }))}
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity (seats)</Label>
                <Input type="number" value={selected.capacity}
                  onChange={e => setSelected(v => ({ ...v, capacity: Number(e.target.value) }))}
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Label / Note</Label>
                <Input value={selected.label || ""}
                  onChange={e => setSelected(v => ({ ...v, label: e.target.value }))}
                  placeholder="e.g. Window seat, VIP..."
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setSelected(v => ({ ...v, status: s }))}
                      className={`text-xs font-medium px-3 py-2 rounded-xl border capitalize transition-all ${selected.status === s ? statusStyle[s] : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                onClick={() => deleteTable(selected)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                updateTable(selected.id, { num: selected.num, capacity: selected.capacity, label: selected.label, status: selected.status });
                setSelected(null);
              }}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Table</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Table Number *</Label><Input type="number" value={addForm.num} onChange={e => { setAddForm(f => ({ ...f, num: e.target.value })); setAddErrors(er => ({...er,num:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(addErrors, "num") ? "border-red-500" : ""}`} />{fieldError(addErrors, "num") && <p className="text-xs text-red-400">{fieldError(addErrors, "num")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Capacity *</Label><Input type="number" value={addForm.capacity} onChange={e => { setAddForm(f => ({ ...f, capacity: e.target.value })); setAddErrors(er => ({...er,capacity:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(addErrors, "capacity") ? "border-red-500" : ""}`} />{fieldError(addErrors, "capacity") && <p className="text-xs text-red-400">{fieldError(addErrors, "capacity")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Label</Label><Input value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} className="h-9 bg-white/5 border-white/10 text-sm" /></div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={addTable}>Add Table</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
