import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Zap, Star, Crown, CreditCard, X, Pencil, Save, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { getSession } from "@/lib/restaurantAuth";
import { toast } from "sonner";

const DEFAULT_PLANS = [
  { id: "basic", name: "Basic POS", price: 999, icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", features: ["1 Branch", "POS Billing", "Basic Reports", "Order Management", "Email Support"], maxBranches: 1 },
  { id: "standard", name: "Standard", price: 2499, icon: Star, color: "text-primary", bg: "bg-primary/10 border-primary/30", features: ["3 Branches", "All Basic features", "Inventory Management", "Vendor Management", "Staff & Attendance", "Priority Support"], maxBranches: 3, popular: true },
  { id: "premium", name: "Premium Franchise", price: 4999, icon: Crown, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", features: ["Unlimited Branches", "All Standard features", "Franchise Payments", "AI Expansion Tools", "Swiggy & Zomato Integration", "Advanced Analytics", "Dedicated Support"], maxBranches: Infinity },
];

const BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];

const today = new Date();
const dueDate = new Date(today); dueDate.setDate(today.getDate() + 5);

export default function Subscriptions() {
  const session = getSession();
  const isOwner = !session || session.role === "super_admin" || session.role === "admin";

  const [currentPlan, setCurrentPlan] = useState("standard");
  const [paymentStatus, setPaymentStatus] = useState("active");
  const [showPayModal, setShowPayModal] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [paying, setPaying] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [branchPlans, setBranchPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem("branch_plans") || "{}"); } catch { return {}; }
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isOwner) {
      base44.entities.AppUser.list("full_name", 100).then(setUsers).catch(() => {});
    }
  }, [isOwner]);

  const activePlan = plans.find(p => p.id === currentPlan);
  const isExpired = paymentStatus === "expired";
  const isDue = paymentStatus === "due";

  const handlePay = async () => {
    setPaying(true);
    await new Promise(r => setTimeout(r, 1500));
    setPaymentStatus("active");
    setShowPayModal(false);
    setPaying(false);
    toast.success("Payment successful! Subscription activated.");
  };

  const startEdit = (plan) => {
    setEditingPlan(plan.id);
    setEditForm({ price: plan.price, name: plan.name, features: plan.features.join("\n") });
  };

  const saveEdit = () => {
    setPlans(prev => prev.map(p => p.id === editingPlan ? {
      ...p, name: editForm.name, price: Number(editForm.price),
      features: editForm.features.split("\n").filter(Boolean),
    } : p));
    setEditingPlan(null);
    toast.success("Plan updated successfully!");
  };

  const assignBranchPlan = (branch, planId) => {
    const updated = { ...branchPlans, [branch]: planId };
    setBranchPlans(updated);
    localStorage.setItem("branch_plans", JSON.stringify(updated));
    toast.success(`${branch} assigned to ${plans.find(p => p.id === planId)?.name}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage plans, billing, and branch assignments</p>
        </div>
      </div>

      {(isExpired || isDue) && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isExpired ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
          <AlertCircle className={`w-5 h-5 shrink-0 ${isExpired ? "text-red-400" : "text-yellow-400"}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isExpired ? "text-red-400" : "text-yellow-400"}`}>
              {isExpired ? "Subscription Expired" : `Payment Due — ${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{isExpired ? "Your access has been restricted. Pay now to reactivate." : "Please renew to avoid service interruption."}</p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90 glow-orange shrink-0" onClick={() => setShowPayModal(true)}>Pay Now</Button>
        </div>
      )}

      {/* Current Plan */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        {activePlan && (
          <>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${activePlan.bg}`}>
              <activePlan.icon className={`w-6 h-6 ${activePlan.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-bold text-foreground">{activePlan.name}</p>
              <p className="text-xs text-muted-foreground">₹{activePlan.price.toLocaleString()}/month · {activePlan.maxBranches === Infinity ? "Unlimited" : `Up to ${activePlan.maxBranches}`} Branches</p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${paymentStatus === "active" ? "bg-green-500/10 text-green-400" : isExpired ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                {paymentStatus === "active" ? "Active" : isExpired ? "Expired" : "Payment Due"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Next billing: {dueDate.toLocaleDateString("en-IN")}</p>
            </div>
          </>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(plan => {
          const Icon = plan.icon;
          const isActive = plan.id === currentPlan;
          const isEditing = editingPlan === plan.id;
          return (
            <div key={plan.id} className={`glass rounded-2xl p-5 flex flex-col gap-4 border transition-all ${isActive ? "border-primary/40 glow-orange" : "border-white/5 hover:border-white/10"}`}>
              {plan.popular && <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Most Popular</div>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${plan.bg}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <div>
                    {isEditing ? <Input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="h-7 bg-white/5 border-white/10 text-xs w-28" /> : <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>}
                    <p className="text-xs text-muted-foreground">{plan.maxBranches === Infinity ? "Unlimited" : `Up to ${plan.maxBranches}`} branches</p>
                  </div>
                </div>
                {isOwner && !isEditing && (
                  <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg hover:bg-white/10"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                )}
                {isOwner && isEditing && (
                  <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-green-500/10"><Save className="w-3.5 h-3.5 text-green-400" /></button>
                )}
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-1"><span className="text-xl font-black text-foreground">₹</span><Input type="number" value={editForm.price} onChange={e => setEditForm(f => ({...f, price: e.target.value}))} className="h-8 bg-white/5 border-white/10 text-sm w-24" /></div>
                ) : (
                  <div><span className="text-3xl font-black text-foreground">₹{plan.price.toLocaleString()}</span><span className="text-sm text-muted-foreground">/month</span></div>
                )}
              </div>
              <ul className="space-y-2 flex-1">
                {(isEditing ? editForm.features.split("\n").filter(Boolean) : plan.features).map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div>
                  <Label className="text-xs mb-1 block">Features (one per line)</Label>
                  <textarea value={editForm.features} onChange={e => setEditForm(f => ({...f, features: e.target.value}))} className="w-full h-20 rounded-md bg-white/5 border border-white/10 text-xs px-3 py-2 text-foreground" />
                </div>
              )}
              {isActive ? (
                <div className="flex items-center gap-2 text-xs text-primary font-medium"><CheckCircle className="w-4 h-4" /> Current Plan</div>
              ) : (
                <Button size="sm" className={plan.popular ? "bg-primary hover:bg-primary/90 glow-orange" : "bg-white/5 border border-white/10 hover:bg-white/10"}
                  onClick={() => { setCurrentPlan(plan.id); setPaymentStatus("due"); }}>
                  {plan.price > (activePlan?.price || 0) ? "Upgrade" : "Downgrade"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Branch Plan Assignment (owner only) */}
      {isOwner && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Assign Plans to Branches</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BRANCHES.map(branch => (
              <div key={branch} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                <span className="text-sm text-foreground">{branch}</span>
                <select value={branchPlans[branch] || currentPlan} onChange={e => assignBranchPlan(branch, e.target.value)}
                  className="h-8 rounded-md bg-secondary border border-white/10 text-xs px-2 text-foreground">
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulate payment status (owner only) */}
      {isOwner && (
        <div className="glass rounded-2xl p-4 flex flex-wrap gap-3">
          <p className="text-xs text-muted-foreground w-full">Simulate payment status:</p>
          {["active","due","expired"].map(s => (
            <button key={s} onClick={() => setPaymentStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${paymentStatus === s ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Complete Payment</h2>
              <button onClick={() => setShowPayModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="glass rounded-xl p-3 flex justify-between text-sm">
              <span className="text-muted-foreground">{activePlan?.name}</span>
              <span className="font-bold text-foreground">₹{activePlan?.price.toLocaleString()}</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Card Number</Label><Input placeholder="1234 5678 9012 3456" value={cardNum} onChange={e => setCardNum(e.target.value)} className="h-9 bg-white/5 border-white/10 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Expiry</Label><Input placeholder="MM/YY" className="h-9 bg-white/5 border-white/10 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">CVV</Label><Input placeholder="123" className="h-9 bg-white/5 border-white/10 text-sm" /></div>
              </div>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 glow-orange" onClick={handlePay} disabled={paying}>
              <CreditCard className="w-4 h-4 mr-2" />{paying ? "Processing..." : "Pay & Activate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}