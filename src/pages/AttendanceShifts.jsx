import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, required } from "@/lib/formValidation";

const st = { present: "bg-green-500/10 text-green-400", absent: "bg-red-500/10 text-red-400", upcoming: "bg-blue-500/10 text-blue-400", late: "bg-yellow-500/10 text-yellow-400", on_leave: "bg-purple-500/10 text-purple-400" };
const ROLES = ["Cashier","Kitchen Staff","Manager","Delivery Rider","Waiter","Accountant"];
const SHIFTS = ["Morning (8AM-4PM)","Evening (4PM-12AM)","Night (12AM-8AM)"];

export default function AttendanceShifts() {
  const [items, setItems] = useState([]);
  const [staffList, setStaffList] = useState([]);  // NEW
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ staff_name: "", role: "Cashier", shift: "Morning (8AM-4PM)", date: new Date().toISOString().split("T")[0], check_in: "", check_out: "", status: "present" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Attendance.list("-created_date", 100).then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  
  const loadStaff = () => 
  base44.entities.User.list("full_name", 200)
    .then(d => setStaffList(d))
    .catch(() => {});
  
  useEffect(() => { load(); loadStaff(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ staff_name: "", role: "Cashier", shift: "Morning (8AM-4PM)", date: new Date().toISOString().split("T")[0], check_in: "", check_out: "", status: "present" }); setShowForm(true); };
  const openEdit = (a) => { setEditing(a); setErrors({}); setForm({ staff_name: a.staff_name, role: a.role||"Cashier", shift: a.shift, date: a.date, check_in: a.check_in||"", check_out: a.check_out||"", status: a.status }); setShowForm(true); };
  const validate = () => {
    const next = {};
    required(next, "staff_name", form.staff_name);
    required(next, "role", form.role);
    required(next, "shift", form.shift);
    required(next, "date", form.date);
    required(next, "status", form.status);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => { if (!validate()) return; if (editing) await base44.entities.Attendance.update(editing.id, form); else await base44.entities.Attendance.create(form); setShowForm(false); load(); };
  const remove = async (id) => { await base44.entities.Attendance.delete(id); load(); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Attendance &amp; Shifts</h1><p className="text-sm text-muted-foreground">{items.length} records</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Record</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Staff","Role","Shift","Date","Check-in","Check-out","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No records yet.</td></tr> : items.map(a => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium text-foreground">{a.staff_name}</td>
                  <td className="p-4 text-muted-foreground">{a.role}</td>
                  <td className="p-4 text-muted-foreground text-xs">{a.shift}</td>
                  <td className="p-4 text-muted-foreground">{a.date}</td>
                  <td className="p-4 text-foreground">{a.check_in || "—"}</td>
                  <td className="p-4 text-muted-foreground">{a.check_out || "—"}</td>
                  <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st[a.status]}`}>{a.status}</span></td>
                  <td className="p-4 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10" onClick={() => openEdit(a)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(a.id)}><Trash2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing?"Edit":"New"} Attendance Record</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">

              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Staff Name *</Label>
                <select
                  value={form.staff_name}
                  onChange={e => { setForm(f => ({ ...f, staff_name: e.target.value })); setErrors(er => ({ ...er, staff_name: "" })); }}
                  className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "staff_name") ? "border-red-500" : "border-white/10"}`}
                >
                 <option value="">— Select Staff —</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.full_name}>{s.full_name}</option>
                  ))}
                </select>
                {fieldError(errors, "staff_name") && <p className="text-xs text-red-400">{fieldError(errors, "staff_name")}</p>}
              </div>

              <div className="space-y-1.5"><Label className="text-xs">Role</Label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Shift</Label>
                <select value={form.shift} onChange={e=>setForm(f=>({...f,shift:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {SHIFTS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={form.date} onChange={e=>{ setForm(f=>({...f,date:e.target.value})); setErrors(er=>({...er,date:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "date") ? "border-red-500" : ""}`} />{fieldError(errors, "date") && <p className="text-xs text-red-400">{fieldError(errors, "date")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["present","absent","late","on_leave"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Check In</Label><Input type="time" value={form.check_in} onChange={e=>setForm(f=>({...f,check_in:e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Check Out</Label><Input type="time" value={form.check_out} onChange={e=>setForm(f=>({...f,check_out:e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" /></div>
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