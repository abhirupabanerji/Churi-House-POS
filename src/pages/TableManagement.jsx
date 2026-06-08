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

const LS_KEY = "churi_tables_state";

const defaultTables = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1, num: i + 1,
  capacity: [2, 2, 4, 4, 6, 6, 8][i % 7],
  status: ["available", "occupied", "occupied", "reserved", "available"][i % 5],
  label: "",
}));

function loadTables() {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : defaultTables;
  } catch { return defaultTables; }
}

export default function TableManagement() {
  const [tables, setTables] = useState(loadTables);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ num: "", capacity: 4, label: "" });
  const [addErrors, setAddErrors] = useState({});

  // Persist to localStorage whenever tables change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(tables));
  }, [tables]);

  // Sync reserved tables from Reservations entity
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    base44.entities.Reservation.filter({ status: "confirmed", date: today })
      .then(confirmed => {
        if (!confirmed.length) return;
        setTables(prev => {
          const updated = [...prev];
          confirmed.forEach(r => {
            if (r.table_number) {
              const idx = updated.findIndex(t => String(t.num) === String(r.table_number));
              if (idx >= 0 && updated[idx].status === "available") {
                updated[idx] = { ...updated[idx], status: "reserved", label: `Res: ${r.guest_name}` };
              }
            }
          });
          return updated;
        });
      }).catch(() => {});

    // Real-time subscription
    const unsub = base44.entities.Reservation.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        const r = event.data;
        if (r.status === "confirmed" && r.table_number) {
          setTables(prev => prev.map(t =>
            String(t.num) === String(r.table_number) && t.status === "available"
              ? { ...t, status: "reserved", label: `Res: ${r.guest_name}` } : t
          ));
        }
      }
    });
    return unsub;
  }, []);

  const updateTable = (id, changes) => setTables(ts => ts.map(t => t.id === id ? { ...t, ...changes } : t));
  const deleteTable = (id) => { setTables(ts => ts.filter(t => t.id !== id)); setSelected(null); };

  const validateAddTable = () => {
    const next = {};
    positiveNumber(next, "num", addForm.num);
    positiveNumber(next, "capacity", addForm.capacity);
    setAddErrors(next);
    return Object.keys(next).length === 0;
  };

  const addTable = () => {
    if (!validateAddTable()) return;
    setTables(ts => [...ts, { id: Date.now(), num: Number(addForm.num), capacity: Number(addForm.capacity), status: "available", label: addForm.label }]);
    setAddForm({ num: "", capacity: 4, label: "" });
    setShowAdd(false);
  };

  const visibleTables = [...tables].sort((a, b) => a.num - b.num);
  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: visibleTables.filter(t => t.status === s).length }), {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
          <p className="text-sm text-muted-foreground">{tables.length} tables · State saved automatically</p>
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

      <div className="grid grid-cols-4 md:grid-cols-5 xl:grid-cols-8 gap-3">
        {visibleTables.map(t => (
          <div key={t.id} onClick={() => setSelected(t)}
            className={`glass rounded-2xl p-4 text-center border cursor-pointer transition-all ${statusStyle[t.status]}`}>
            <p className="text-lg font-bold">{t.num}</p>
            <p className="text-[10px] opacity-70">{t.capacity} seats</p>
            {t.label && <p className="text-[9px] mt-0.5 opacity-60 truncate">{t.label}</p>}
          </div>
        ))}
      </div>

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
                  onChange={e => { const v = { ...selected, num: Number(e.target.value) }; setSelected(v); updateTable(v.id, { num: v.num }); }}
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity (seats)</Label>
                <Input type="number" value={selected.capacity}
                  onChange={e => { const v = { ...selected, capacity: Number(e.target.value) }; setSelected(v); updateTable(v.id, { capacity: v.capacity }); }}
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Label / Note</Label>
                <Input value={selected.label || ""}
                  onChange={e => { const v = { ...selected, label: e.target.value }; setSelected(v); updateTable(v.id, { label: v.label }); }}
                  placeholder="e.g. Window seat, VIP..."
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => { setSelected(sv => ({ ...sv, status: s })); updateTable(selected.id, { status: s }); }}
                      className={`text-xs font-medium px-3 py-2 rounded-xl border capitalize transition-all ${selected.status === s ? statusStyle[s] : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => deleteTable(selected.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setSelected(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

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
