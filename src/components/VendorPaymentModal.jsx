import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldError, positiveNumber, required } from "@/lib/formValidation";
import { logAudit } from "@/lib/restaurantAuth";

function VendorReceipt({ payment, vendor, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white text-black rounded-2xl p-6 w-80 mx-4 space-y-3">
        <div className="text-center border-b border-gray-200 pb-3">
          <h2 className="font-bold text-lg">Churi House</h2>
          <p className="text-xs text-gray-500">Vendor Payment Receipt</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleString("en-IN")}</p>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="font-medium">{vendor.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-lg">₹{(payment.amount||0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{payment.payment_method?.replace("_"," ")}</span></div>
          {payment.reference_number && <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono text-xs">{payment.reference_number}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date().toLocaleDateString("en-IN")}</span></div>
          {payment.notes && <div className="flex justify-between"><span className="text-gray-500">Notes</span><span className="text-right max-w-[60%]">{payment.notes}</span></div>}
        </div>
        <div className="border-t border-gray-200 pt-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-sm font-semibold">Payment Recorded</span></div>
          <p className="text-xs text-gray-400 mt-1">Balance updated: ₹{Math.max(0, (vendor.outstanding_balance||0) - (payment.amount||0)).toLocaleString()}</p>
        </div>
        <Button className="w-full bg-gray-900 text-white hover:bg-gray-800" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default function VendorPaymentModal({ vendor, onClose }) {
  const [form, setForm] = useState({ amount: vendor.outstanding_balance || 0, payment_method: "bank_transfer", reference_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [receipt, setReceipt] = useState(null);

  const validate = () => {
    const next = {};
    positiveNumber(next, "amount", form.amount);
    required(next, "payment_method", form.payment_method);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const paymentData = {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      amount: form.amount,
      payment_method: form.payment_method,
      reference_number: form.reference_number,
      notes: form.notes,
      paid_date: new Date().toISOString().split("T")[0],
      status: "paid",
    };
    await base44.entities.VendorPayment.create(paymentData);
    const newBalance = Math.max(0, (vendor.outstanding_balance || 0) - form.amount);
    await base44.entities.Vendor.update(vendor.id, { outstanding_balance: newBalance });
    await logAudit("Vendor Payment", `₹${form.amount.toLocaleString()} paid to ${vendor.name} via ${form.payment_method}`, "finance");
    await base44.entities.Notification.create({
      title: `Payment to ${vendor.name} completed`,
      message: `₹${form.amount.toLocaleString()} paid via ${form.payment_method.replace(/_/g, " ")}${form.reference_number ? ` · Ref: ${form.reference_number}` : ""}`,
      type: "vendor_payment",
      link: "/vendors",
      is_read: false,
      timestamp: new Date().toISOString(),
      for_roles: ["super_admin", "admin"],
    }).catch(() => {});
    setSaving(false);
    setReceipt({ ...paymentData });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Vendor Payment</h2>
              <p className="text-xs text-muted-foreground">{vendor.name} · Outstanding: ₹{(vendor.outstanding_balance||0).toLocaleString()}</p>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={e=>{ setForm(f=>({...f,amount:e.target.value})); setErrors(er=>({...er,amount:""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, "amount") ? "border-red-500" : ""}`} />
              {fieldError(errors, "amount") && <p className="text-xs text-red-400">{fieldError(errors, "amount")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <select value={form.payment_method} onChange={e=>{ setForm(f=>({...f,payment_method:e.target.value})); setErrors(er=>({...er,payment_method:""})); }} className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${fieldError(errors, "payment_method") ? "border-red-500" : "border-white/10"}`}>
                {["cash","bank_transfer","upi","cheque"].map(m=><option key={m} value={m}>{m.replace("_"," ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference / UTR Number</Label>
              <Input value={form.reference_number} onChange={e=>setForm(f=>({...f,reference_number:e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" placeholder="Transaction ref..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="h-9 bg-white/5 border-white/10 text-sm" placeholder="Optional notes..." />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 glow-orange" onClick={save} disabled={saving}>
              <CreditCard className="w-4 h-4 mr-1" />{saving ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </div>
      {receipt && <VendorReceipt payment={receipt} vendor={vendor} onClose={() => { setReceipt(null); onClose(); }} />}
    </>
  );
}