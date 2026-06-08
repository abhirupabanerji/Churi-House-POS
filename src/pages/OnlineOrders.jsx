import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PlatformSettings from "@/components/online/PlatformSettings";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";
import { softDelete } from "@/lib/softDelete";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
const PLATFORMS = [
  { name: "Swiggy", orders: 38, revenue: "₹28,400", status: "connected", color: "text-orange-400" },
  { name: "Zomato", orders: 24, revenue: "₹18,200", status: "connected", color: "text-red-400" },
  { name: "Website", orders: 12, revenue: "₹9,600", status: "connected", color: "text-blue-400" },
  { name: "WhatsApp", orders: 6, revenue: "₹4,800", status: "pending", color: "text-green-400" },
];

const statusStyle = { pending:"bg-yellow-500/10 text-yellow-400", preparing:"bg-blue-500/10 text-blue-400", ready:"bg-green-500/10 text-green-400", completed:"bg-muted text-muted-foreground", cancelled:"bg-red-500/10 text-red-400" };

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [platformFilter, setPlatformFilter] = useState(() => new URLSearchParams(window.location.search).get("platform") || "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", type: "swiggy", items: [], total: 0, status: "pending", notes: "" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Order.filter({ type: "swiggy" }).then(() => {}).catch(() => {});
  useEffect(() => {
    base44.entities.Order.list("-created_date", 50).then(d => {
      setOrders(d.filter(o => ["swiggy","zomato","online"].includes(o.type)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const validate = () => {
    const next = {};
    required(next, "customer_name", form.customer_name);
    required(next, "customer_phone", form.customer_phone);
    required(next, "type", form.type);
    positiveNumber(next, "total", form.total);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const orderNum = `CH-${Date.now().toString(36).toUpperCase()}`;
    if (editing) await base44.entities.Order.update(editing.id, form);
    else await base44.entities.Order.create({ ...form, order_number: orderNum });
    setShowForm(false);
    base44.entities.Order.list("-created_date", 50).then(d => { setOrders(d.filter(o => ["swiggy","zomato","online"].includes(o.type))); });
  };

  const updateStatus = async (id, status) => { await base44.entities.Order.update(id, { status }); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); };
  const remove = async (o) => {
    if (!confirm(`Delete order ${o.order_number}?`)) return;
    try {
      await softDelete({
        module: "Online Orders",
        id: o.id,
        name: o.order_number,
        data: o,
      });
      await base44.entities.Order.delete(o.id);
      logAudit({
        action: `Online order deleted: ${o.order_number}`,
        type: "order",
        details: `Platform: ${o.type} | ₹${o.total} | Customer: ${o.customer_name || "—"}`,
      });
      toast.success(`🗑️ Order ${o.order_number} moved to Recycle Bin.`);
      setOrders(prev => prev.filter(ord => ord.id !== o.id));
    } catch (err) {
      toast.error("Failed to delete order.");
      console.error(err);
    }
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Online Orders</h1><p className="text-sm text-muted-foreground">All ordering channels</p></div>
        <Button onClick={() => { setEditing(null); setErrors({}); setForm({ customer_name: "", customer_phone: "", type: "swiggy", items: [], total: 0, status: "pending", notes: "" }); setShowForm(true); }} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Order</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLATFORMS.map(p => (
          <div key={p.name} className="glass rounded-2xl p-4 hover:glow-orange transition-all">
            <div className="flex items-center justify-between mb-2"><Globe className={`w-5 h-5 ${p.color}`} /><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === "connected" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{p.status}</span></div>
            <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
            <p className="text-xl font-bold text-primary">{p.revenue}</p>
            <p className="text-xs text-muted-foreground">{p.orders} orders today</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 glass rounded-xl p-3">
        <div className="flex gap-1">
          {[["all","All"],["swiggy","Swiggy"],["zomato","Zomato"],["online","Website"]].map(([v,l]) => (
            <button key={v} onClick={() => setPlatformFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${platformFilter===v?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2 text-foreground" />
          <span className="text-muted-foreground text-xs">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2 text-foreground" />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-primary hover:underline">Clear</button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5"><h3 className="text-sm font-semibold text-foreground">Recent Online Orders</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Order#","Customer","Platform","Total","Status","Actions"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {orders.filter(o => {
                if (platformFilter !== "all" && o.type !== platformFilter) return false;
                if (dateFrom && o.created_date && new Date(o.created_date) < new Date(dateFrom)) return false;
                if (dateTo && o.created_date && new Date(o.created_date) > new Date(dateTo + "T23:59:59")) return false;
                return true;
              }).length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders match the filters.</td></tr> : orders.filter(o => {
                if (platformFilter !== "all" && o.type !== platformFilter) return false;
                if (dateFrom && o.created_date && new Date(o.created_date) < new Date(dateFrom)) return false;
                if (dateTo && o.created_date && new Date(o.created_date) > new Date(dateTo + "T23:59:59")) return false;
                return true;
              }).map(o => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-mono font-bold text-foreground">{o.order_number}</td>
                  <td className="p-4 text-foreground">{o.customer_name||"—"}</td>
                  <td className="p-4"><span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary capitalize">{o.type}</span></td>
                  <td className="p-4 font-semibold text-primary">₹{o.total}</td>
                  <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[o.status]||statusStyle.pending}`}>{o.status}</span></td>
                  <td className="p-4 flex gap-1">
                    {o.status === "pending" && <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(o.id, "preparing")}>Start</Button>}
                    {o.status === "preparing" && <Button size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700" onClick={() => updateStatus(o.id, "ready")}>Ready</Button>}
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(o)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Platform Settings */}
      <PlatformSettings />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">New Online Order</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Customer Name *</Label><Input value={form.customer_name} onChange={e=>{ setForm(f=>({...f,customer_name:e.target.value})); setErrors(er=>({...er,customer_name:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "customer_name") ? "border-red-500" : ""}`} />{fieldError(errors, "customer_name") && <p className="text-xs text-red-400">{fieldError(errors, "customer_name")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={form.customer_phone} onChange={e=>{ setForm(f=>({...f,customer_phone:e.target.value.replace(/\D/g,"").slice(0,10)})); setErrors(er=>({...er,customer_phone:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "customer_phone") ? "border-red-500" : ""}`} />{fieldError(errors, "customer_phone") && <p className="text-xs text-red-400">{fieldError(errors, "customer_phone")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Platform</Label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {["swiggy","zomato","online"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Total (?) *</Label><Input type="number" value={form.total} onChange={e=>{ setForm(f=>({...f,total:e.target.value})); setErrors(er=>({...er,total:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "total") ? "border-red-500" : ""}`} />{fieldError(errors, "total") && <p className="text-xs text-red-400">{fieldError(errors, "total")}</p>}</div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" /></div>
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