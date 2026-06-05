import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";

const INIT_TXN = [
  { type: "Opening Balance", amount: 5000, time: "9:00 AM", by: "Manager" },
  { type: "Cash Sale", amount: 1240, time: "10:15 AM", by: "Cashier" },
  { type: "Cash Sale", amount: 680, time: "11:30 AM", by: "Cashier" },
  { type: "Petty Cash Out", amount: -500, time: "12:00 PM", by: "Manager" },
  { type: "Cash Sale", amount: 2100, time: "1:45 PM", by: "Cashier" },
];

export default function CashDrawer() {
  const [txns, setTxns] = useState(INIT_TXN);
  const [showCashOut, setShowCashOut] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [form, setForm] = useState({ amount: 0, reason: "", by: "Manager" });
  const [errors, setErrors] = useState({});
  const [closed, setClosed] = useState(false);

  const openBalance = txns.find(t => t.type === "Opening Balance")?.amount || 0;
  const cashIn = txns.filter(t => t.amount > 0 && t.type !== "Opening Balance").reduce((s,t) => s+t.amount, 0);
  const cashOut = Math.abs(txns.filter(t => t.amount < 0).reduce((s,t) => s+t.amount, 0));
  const current = openBalance + cashIn - cashOut;

  const validateCashOut = () => {
    const next = {};
    positiveNumber(next, "amount", form.amount);
    required(next, "reason", form.reason);
    required(next, "by", form.by);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const doCashOut = () => {
    if (!validateCashOut()) return;
    setTxns(prev => [...prev, { type: `Cash Out � ${form.reason}`, amount: -form.amount, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), by: form.by }]);
    setShowCashOut(false); setForm({ amount: 0, reason: "", by: "Manager" });
  };
  const closeDrawer = () => { setClosed(true); setShowClose(false); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Cash Drawer</h1><p className="text-sm text-muted-foreground">{closed ? "Drawer closed" : "Today's cash flow"}</p></div>
        {!closed && (
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/5 border-white/10" onClick={() => { setErrors({}); setShowCashOut(true); }}>Cash Out</Button>
            <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={() => setShowClose(true)}>Close Drawer</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["Opening Balance",`₹${openBalance.toLocaleString()}`,"text-foreground"],["Total Cash In",`₹${cashIn.toLocaleString()}`,"text-green-400"],["Current Balance",`₹${current.toLocaleString()}`,"text-primary"]].map(([l,v,c])=>(
          <div key={l} className="glass rounded-2xl p-5 text-center"><p className="text-xs text-muted-foreground mb-1">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/5">{["Transaction","Amount","Time","By"].map(h=><th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {txns.map((t, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-foreground">{t.type}</td>
                <td className={`p-4 font-semibold ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>{t.amount >= 0 ? "+" : ""}₹{Math.abs(t.amount).toLocaleString()}</td>
                <td className="p-4 text-muted-foreground">{t.time}</td>
                <td className="p-4 text-muted-foreground">{t.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash Out Modal */}
      {showCashOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">Cash Out</h2><button onClick={() => setShowCashOut(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (?) *</Label><Input type="number" value={form.amount} onChange={e=>{ setForm(f=>({...f,amount:e.target.value})); setErrors(er=>({...er,amount:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "amount") ? "border-red-500" : ""}`} />{fieldError(errors, "amount") && <p className="text-xs text-red-400">{fieldError(errors, "amount")}</p>}</div>
            <div className="space-y-1.5"><Label className="text-xs">Reason *</Label><Input value={form.reason} onChange={e=>{ setForm(f=>({...f,reason:e.target.value})); setErrors(er=>({...er,reason:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "reason") ? "border-red-500" : ""}`} />{fieldError(errors, "reason") && <p className="text-xs text-red-400">{fieldError(errors, "reason")}</p>}</div>
            <div className="space-y-1.5"><Label className="text-xs">Authorized By *</Label><Input value={form.by} onChange={e=>{ setForm(f=>({...f,by:e.target.value})); setErrors(er=>({...er,by:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "by") ? "border-red-500" : ""}`} />{fieldError(errors, "by") && <p className="text-xs text-red-400">{fieldError(errors, "by")}</p>}</div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowCashOut(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={doCashOut}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Drawer Confirm */}
      {showClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-foreground">Close Drawer</h2><button onClick={() => setShowClose(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <p className="text-sm text-muted-foreground">Final balance: <span className="font-bold text-primary">₹{current.toLocaleString()}</span></p>
            <p className="text-xs text-yellow-400">This will finalize today's cash count. Are you sure?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowClose(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={closeDrawer}>Close Drawer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}