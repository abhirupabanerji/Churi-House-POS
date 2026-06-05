import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fieldError, nonNegativeNumber, positiveNumber, required } from "@/lib/formValidation";

const BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];
const MONTHS = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06"];
const statusStyle = { paid: "bg-green-500/10 text-green-400", calculated: "bg-yellow-500/10 text-yellow-400", disputed: "bg-red-500/10 text-red-400" };
const tt = { background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 };
const COLORS = ["#ea580c", "#f59e0b", "#10b981", "#3b82f6"];

export default function FranchisePayments() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [showCalc, setShowCalc] = useState(false);
  const [calcForm, setCalcForm] = useState({ month: "2026-05", branch_name: "Main Branch", total_revenue: 0, total_expenses: 0, franchise_fee_percent: 5, royalty_percent: 3 });
  const [calcResult, setCalcResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = () => base44.entities.FranchisePayment.list("-created_date", 200).then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const monthRecords = records.filter(r => r.month === selectedMonth);
  const totalRevenue = monthRecords.reduce((s,r)=>s+(r.total_revenue||0),0);
  const totalNetProfit = monthRecords.reduce((s,r)=>s+(r.net_profit||0),0);
  const totalFees = monthRecords.reduce((s,r)=>s+(r.franchise_fee_amount||0)+(r.royalty_amount||0),0);

  const validateCalc = () => {
    const next = {};
    required(next, "month", calcForm.month);
    required(next, "branch_name", calcForm.branch_name);
    positiveNumber(next, "total_revenue", calcForm.total_revenue);
    nonNegativeNumber(next, "total_expenses", calcForm.total_expenses);
    nonNegativeNumber(next, "franchise_fee_percent", calcForm.franchise_fee_percent);
    nonNegativeNumber(next, "royalty_percent", calcForm.royalty_percent);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const calculate = () => {
    if (!validateCalc()) return;
    const gross = calcForm.total_revenue - calcForm.total_expenses;
    const fee = Math.round(calcForm.total_revenue * calcForm.franchise_fee_percent / 100);
    const royalty = Math.round(calcForm.total_revenue * calcForm.royalty_percent / 100);
    const net = gross - fee - royalty;
    const branchId = calcForm.branch_name.toLowerCase().replace(/ /g, "_");
    setCalcResult({ ...calcForm, branch_id: branchId, gross_profit: gross, franchise_fee_amount: fee, royalty_amount: royalty, net_profit: net, status: "calculated" });
  };

  const saveCalc = async () => {
    if (!calcResult) return;
    setSaving(true);
    await base44.entities.FranchisePayment.create(calcResult);
    setSaving(false);
    setShowCalc(false);
    setCalcResult(null);
    load();
  };

  const chartMonths = MONTHS.map(m => {
    const entry = { month: m.slice(5) };
    BRANCHES.forEach(b => { entry[b] = records.filter(r=>r.month===m&&r.branch_name===b).reduce((s,r)=>s+(r.net_profit||0),0); });
    return entry;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Franchise Payments</h1><p className="text-sm text-muted-foreground">Monthly profit distribution per branch</p></div>
        <Button onClick={() => { setErrors({}); setCalcResult(null); setShowCalc(true); }} className="bg-primary hover:bg-primary/90 glow-orange"><Calculator className="w-4 h-4 mr-1" /> Calculate Month</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["Network Revenue",`₹${totalRevenue.toLocaleString()}`,"text-primary"],["Net Profit",`₹${totalNetProfit.toLocaleString()}`,"text-green-400"],["Fees Collected",`₹${totalFees.toLocaleString()}`,"text-yellow-400"]].map(([l,v,c])=>(
          <div key={l} className="glass rounded-2xl p-5 text-center"><p className="text-xs text-muted-foreground mb-1">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Net Profit by Branch</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartMonths}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
            <Tooltip contentStyle={tt} formatter={v=>`₹${v.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {BRANCHES.map((b,i)=><Bar key={b} dataKey={b} fill={COLORS[i]} radius={[3,3,0,0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Profit Distribution</h3>
          <select className="bg-secondary border border-white/10 rounded-lg text-xs px-3 py-1.5 text-foreground" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
            {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/5">{["Branch","Revenue","Expenses","Gross Profit","Franchise Fee","Royalty","Net Profit","Status"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {monthRecords.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No records for this month. Use "Calculate Month" to add data.</td></tr> : monthRecords.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 font-medium text-foreground">{r.branch_name}</td>
                <td className="p-4 text-foreground">₹{(r.total_revenue||0).toLocaleString()}</td>
                <td className="p-4 text-red-400">₹{(r.total_expenses||0).toLocaleString()}</td>
                <td className="p-4 text-foreground">₹{(r.gross_profit||0).toLocaleString()}</td>
                <td className="p-4 text-yellow-400">₹{(r.franchise_fee_amount||0).toLocaleString()} ({r.franchise_fee_percent}%)</td>
                <td className="p-4 text-yellow-400">₹{(r.royalty_amount||0).toLocaleString()} ({r.royalty_percent}%)</td>
                <td className="p-4 font-bold text-green-400">₹{(r.net_profit||0).toLocaleString()}</td>
                <td className="p-4"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[r.status]||""}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">Calculate Month</h2><button onClick={()=>{setShowCalc(false);setCalcResult(null);}}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Month</Label>
                <select value={calcForm.month} onChange={e=>setCalcForm(f=>({...f,month:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Branch</Label>
                <select value={calcForm.branch_name} onChange={e=>setCalcForm(f=>({...f,branch_name:e.target.value}))} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Total Revenue (?) *</Label><Input type="number" value={calcForm.total_revenue} onChange={e=>{ setCalcForm(f=>({...f,total_revenue:e.target.value})); setErrors(er=>({...er,total_revenue:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "total_revenue") ? "border-red-500" : ""}`} />{fieldError(errors, "total_revenue") && <p className="text-xs text-red-400">{fieldError(errors, "total_revenue")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Total Expenses (?) *</Label><Input type="number" value={calcForm.total_expenses} onChange={e=>{ setCalcForm(f=>({...f,total_expenses:e.target.value})); setErrors(er=>({...er,total_expenses:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "total_expenses") ? "border-red-500" : ""}`} />{fieldError(errors, "total_expenses") && <p className="text-xs text-red-400">{fieldError(errors, "total_expenses")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Franchise Fee % *</Label><Input type="number" value={calcForm.franchise_fee_percent} onChange={e=>{ setCalcForm(f=>({...f,franchise_fee_percent:e.target.value})); setErrors(er=>({...er,franchise_fee_percent:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "franchise_fee_percent") ? "border-red-500" : ""}`} />{fieldError(errors, "franchise_fee_percent") && <p className="text-xs text-red-400">{fieldError(errors, "franchise_fee_percent")}</p>}</div>
              <div className="space-y-1.5"><Label className="text-xs">Royalty % *</Label><Input type="number" value={calcForm.royalty_percent} onChange={e=>{ setCalcForm(f=>({...f,royalty_percent:e.target.value})); setErrors(er=>({...er,royalty_percent:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "royalty_percent") ? "border-red-500" : ""}`} />{fieldError(errors, "royalty_percent") && <p className="text-xs text-red-400">{fieldError(errors, "royalty_percent")}</p>}</div>
            </div>
            <Button className="w-full bg-white/10 hover:bg-white/20 border border-white/10" onClick={calculate}><Calculator className="w-4 h-4 mr-2" /> Calculate</Button>
            {calcResult && (
              <div className="rounded-xl bg-white/5 p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Profit</span><span className="text-foreground">₹{calcResult.gross_profit.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Franchise Fee</span><span className="text-yellow-400">−₹{calcResult.franchise_fee_amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Royalty</span><span className="text-yellow-400">−₹{calcResult.royalty_amount.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2"><span className="font-semibold text-foreground">Net Profit</span><span className="font-bold text-green-400">₹{calcResult.net_profit.toLocaleString()}</span></div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={()=>{setShowCalc(false);setCalcResult(null);}}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveCalc} disabled={!calcResult||saving}>{saving?"Saving...":"Save Record"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}