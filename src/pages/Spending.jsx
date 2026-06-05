import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CATS = ["Groceries","Staff","Utilities","Rent","Marketing","Maintenance","Misc"];
const tt = { background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 };

export default function Spending() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [filterMethod, setFilterMethod] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ category: "Groceries", description: "", amount: 0, date: new Date().toISOString().split("T")[0], payment_method: "cash" });
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.Expense.list("-created_date", 100).then(d => { setExpenses(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const validate = () => {
    const next = {};
    required(next, "category", form.category);
    required(next, "payment_method", form.payment_method);
    required(next, "description", form.description);
    positiveNumber(next, "amount", form.amount);
    required(next, "date", form.date);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => { if (!validate()) return; await base44.entities.Expense.create(form); setShowForm(false); load(); };
  const remove = async (id) => { await base44.entities.Expense.delete(id); load(); };

  const visibleExpenses = expenses.filter(e => {
    if (filterCat !== "All" && e.category !== filterCat) return false;
    if (filterMethod !== "All" && e.payment_method !== filterMethod) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });
  const chartData = CATS.map(cat => ({ cat, amount: visibleExpenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0) })).filter(d => d.amount > 0);
  const total = visibleExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Spending</h1><p className="text-sm text-muted-foreground">Showing: ₹{total.toLocaleString()} ({visibleExpenses.length} records)</p></div>
        <Button onClick={() => { setErrors({}); setShowForm(true); }} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> Add Expense</Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Category</p>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
            <option value="All">All Categories</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Payment Method</p>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
            <option value="All">All Methods</option>
            {["cash","bank_transfer","upi","card"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Date Range</p>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
            <span className="text-muted-foreground text-xs">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-foreground" />
            {(dateFrom || dateTo || filterCat !== "All" || filterMethod !== "All") && <button onClick={() => { setDateFrom(""); setDateTo(""); setFilterCat("All"); setFilterMethod("All"); }} className="text-xs text-primary hover:underline">Clear</button>}
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="cat" stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <Tooltip contentStyle={tt} formatter={v => `₹${v.toLocaleString()}`} />
              <Bar dataKey="amount" fill="#ea580c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Category","Description","Amount","Date","Method",""].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {visibleExpenses.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses match the current filters.</td></tr> : visibleExpenses.map(e => (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4"><span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">{e.category}</span></td>
                  <td className="p-4 text-muted-foreground">{e.description || "—"}</td>
                  <td className="p-4 font-semibold text-red-400">₹{(e.amount||0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">{e.date}</td>
                  <td className="p-4 text-muted-foreground">{e.payment_method}</td>
                  <td className="p-4"><Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(e.id)}><Trash2 className="w-3 h-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">Add Expense</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                <select value={form.category} onChange={e=>{ setForm(f=>({...f,category:e.target.value})); setErrors(er=>({...er,category:""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "category") ? "border-red-500" : "border-white/10"}`}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Payment Method</Label>
                <select value={form.payment_method} onChange={e=>{ setForm(f=>({...f,payment_method:e.target.value})); setErrors(er=>({...er,payment_method:""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "payment_method") ? "border-red-500" : "border-white/10"}`}>
                  {["cash","bank_transfer","upi","card"].map(m=><option key={m} value={m}>{m.replace("_"," ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Description *</Label><Input value={form.description} onChange={e=>{ setForm(f=>({...f,description:e.target.value})); setErrors(er=>({...er,description:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "description") ? "border-red-500" : ""}`} />{fieldError(errors, "description") && <p className="text-xs text-red-400">{fieldError(errors, "description")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Amount (?) *</Label><Input type="number" value={form.amount} onChange={e=>{ setForm(f=>({...f,amount:e.target.value})); setErrors(er=>({...er,amount:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "amount") ? "border-red-500" : ""}`} />{fieldError(errors, "amount") && <p className="text-xs text-red-400">{fieldError(errors, "amount")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={form.date} onChange={e=>{ setForm(f=>({...f,date:e.target.value})); setErrors(er=>({...er,date:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "date") ? "border-red-500" : ""}`} />{fieldError(errors, "date") && <p className="text-xs text-red-400">{fieldError(errors, "date")}</p>}</div>
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