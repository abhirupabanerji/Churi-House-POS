import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarCheck, Plus, Pencil, Trash2, X } from "lucide-react";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { useEntityQuery, useInvalidate } from "@/lib/useEntityQuery";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusStyle = { pending: "bg-yellow-500/10 text-yellow-400", confirmed: "bg-green-500/10 text-green-400", cancelled: "bg-red-500/10 text-red-400", completed: "bg-muted text-muted-foreground" };

export default function Reservations() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ guest_name: "", phone: "", date: new Date().toISOString().split("T")[0], time: "19:00", guests: 2, table_number: "", status: "confirmed", notes: "" });
  const [errors, setErrors] = useState({});

  const { data: items = [], isLoading: loading } = useEntityQuery("Reservation", { sort: "-created_date", limit: 50 });
  const invalidate = useInvalidate();
  const load = () => invalidate("Reservation");

  const openNew = () => { setEditing(null); setErrors({}); setForm({ guest_name: "", phone: "", date: new Date().toISOString().split("T")[0], time: "19:00", guests: 2, table_number: "", status: "confirmed", notes: "" }); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setErrors({}); setForm({ guest_name: r.guest_name, phone: r.phone || "", date: r.date, time: r.time, guests: r.guests, table_number: r.table_number || "", status: r.status, notes: r.notes || "" }); setShowForm(true); };

  const validateRes = () => {
    const errs = {};
    if (!form.guest_name.trim()) errs.guest_name = "Guest name is required.";
    if (!form.phone.trim()) errs.phone = "Phone is required.";
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = "Phone must be exactly 10 digits.";
    if (!form.table_number.trim()) errs.table_number= "Table number is required.";
    if (!form.date) errs.date = "Date is required.";
    if (!form.time) errs.time = "Time is required.";
    if (!form.guests || form.guests < 1) errs.guests = "At least 1 guest required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validateRes()) return;
    if (editing) {
      await base44.entities.Reservation.update(editing.id, form);
      logAudit({ action: `Reservation updated: ${form.guest_name}`, type: "order", details: `Date: ${form.date} ${form.time}, Guests: ${form.guests}` });
      toast.success(`✅ ${form.guest_name} updated successfully.`);
    } else {
      await base44.entities.Reservation.create(form);
      logAudit({ action: `Reservation created: ${form.guest_name}`, type: "order", details: `Date: ${form.date} ${form.time}, Guests: ${form.guests}` });
      toast.success(`✅ Reservation for ${form.guest_name} added successfully.`);
    }
    setShowForm(false); load();
  };
  const remove = async (id) => {
    const res = items.find(r => r.id === id);
    if (!res || !confirm("Delete reservation?")) return;
    await softDelete({ module: "Reservation", id: res.id, name: res.guest_name, data: res });
    await base44.entities.Reservation.delete(id);
    logAudit({ action: `Reservation deleted: ${res.guest_name}`, type: "order", details: `Date: ${res.date} ${res.time}` });
    toast.success(`🗑️ ${res.guest_name}'s reservation moved to Recycle Bin.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Reservations</h1><p className="text-sm text-muted-foreground">{items.length} reservations</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Reservation</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        items.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center"><CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No reservations yet.</p><Button onClick={openNew} className="mt-4 bg-primary hover:bg-primary/90">Add Reservation</Button></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["Guest","Phone","Date & Time","Guests","Table","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-medium text-foreground">{r.guest_name}</td>
                    <td className="p-4 text-muted-foreground">{r.phone || "—"}</td>
                    <td className="p-4 text-muted-foreground">{r.date}, {r.time}</td>
                    <td className="p-4 text-foreground">{r.guests}</td>
                    <td className="p-4 text-primary">{r.table_number || "—"}</td>
                    <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[r.status]}`}>{r.status}</span></td>
                    <td className="p-4 flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10" onClick={() => openEdit(r)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </td>
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
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">{editing ? "Edit" : "New"} Reservation</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Guest Name *</Label>
                <Input value={form.guest_name} onChange={e => { setForm(f=>({...f,guest_name:e.target.value})); setErrors(e2=>({...e2,guest_name:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.guest_name?"border-red-500":""}`} />
                {errors.guest_name && <p className="text-xs text-red-400">{errors.guest_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => { setForm(f=>({...f,phone:e.target.value.replace(/\D/g,"").slice(0,10)})); setErrors(e2=>({...e2,phone:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.phone?"border-red-500":""}`} />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Table Number *</Label>
                <Input value={form.table_number} onChange={e => { setForm(f=>({...f,table_number:e.target.value})); setErrors(e2=>({...e2,table_number:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.table_number?"border-red-500":""}`} />
                {errors.table_number && <p className="text-xs text-red-400">{errors.table_number}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={form.date} onChange={e => { setForm(f=>({...f,date:e.target.value})); setErrors(e2=>({...e2,date:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.date?"border-red-500":""}`} />
                {errors.date && <p className="text-xs text-red-400">{errors.date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time *</Label>
                <Input type="time" value={form.time} onChange={e => { setForm(f=>({...f,time:e.target.value})); setErrors(e2=>({...e2,time:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.time?"border-red-500":""}`} />
                {errors.time && <p className="text-xs text-red-400">{errors.time}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Guests *</Label>
                <Input type="number" value={form.guests} onChange={e => { setForm(f=>({...f,guests:Number(e.target.value)})); setErrors(e2=>({...e2,guests:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${errors.guests?"border-red-500":""}`} />
                {errors.guests && <p className="text-xs text-red-400">{errors.guests}</p>}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["pending","confirmed","cancelled","completed"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
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