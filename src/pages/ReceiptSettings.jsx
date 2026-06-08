import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ReceiptPreview from "@/components/ReceiptPreview";
import { fieldError, required } from "@/lib/formValidation";
import { toast } from "sonner";
const BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];

const defaultSettings = (branch) => ({
  branch_name: branch,
  branch_id: branch.toLowerCase().replace(/ /g, "_"),
  receipt_header: `Churi House \u2014 ${branch}`,
  receipt_footer: "Thank you for dining with us!",
  receipt_note: "Visit us again \u2022 www.churihouse.com",
  tagline: "Taste the Tradition",
  phone: "+91 90000 00000",
  address: "Hyderabad, Telangana",
  upi_id: "churihouse@upi",
  paper_size: "80mm",
  show_gst: true,
  show_discount: true,
  show_branch_address: true,
  show_server_name: false,
  show_phone: true,
  show_order_type: true,
  show_table_number: true,
  show_payment_method: true,
  show_upi_qr: false,
  receipt_logo_url: "",
});

export default function ReceiptSettings() {
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);
  const [settings, setSettings] = useState(defaultSettings(BRANCHES[0]));
  const [saved, setSaved] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
  const loadBranchSettings = async () => {
    try {
      const existing = await base44.entities.BranchSettings.list("branch_name", 100);
      const match = existing.find(r => r.branch_name === selectedBranch);
      if (match) {
        setSettings(match);
        setSaved(s => ({ ...s, [selectedBranch]: match }));
      } else {
        setSettings(defaultSettings(selectedBranch));
      }
    } catch {
      setSettings(defaultSettings(selectedBranch));
    }
  };
  loadBranchSettings();
}, [selectedBranch]);

  const validate = () => {
    const next = {};
    required(next, "receipt_header", settings.receipt_header);
    required(next, "receipt_footer", settings.receipt_footer);
    required(next, "phone", settings.phone);
    required(next, "address", settings.address);
    required(next, "upi_id", settings.upi_id);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
  if (!validate()) return;
  setSaving(true);
  try {
    const existing = await base44.entities.BranchSettings.list("branch_name", 100);
    const match = existing.find(r => r.branch_name === selectedBranch);
    if (match) {
      await base44.entities.BranchSettings.update(match.id, settings);
    } else {
      await base44.entities.BranchSettings.create(settings);
    }
    setSaved(s => ({ ...s, [selectedBranch]: settings }));
    toast.success("✅ Receipt settings saved successfully.");
  } catch (err) {
    console.error("Save failed:", err);
    toast.error("❌ Failed to save settings.");
  } finally {
    setSaving(false);
  }
};

  const upd = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Receipt Settings</h1><p className="text-sm text-muted-foreground">Customize receipt per branch</p></div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white/5 border-white/10" onClick={() => setShowPreview(true)}><Eye className="w-4 h-4 mr-1" /> Preview</Button>
          <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {BRANCHES.map(b => (
          <button key={b} onClick={() => setSelectedBranch(b)} className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${selectedBranch === b ? "bg-primary text-primary-foreground glow-orange" : "glass text-muted-foreground hover:text-foreground"}`}>{b}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Header &amp; Footer</h3>
          {[["receipt_header","Receipt Header"],["receipt_footer","Footer Text"],["receipt_note","Custom Note"]].map(([k,l]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{l}</Label>
              <Textarea value={settings[k] || ""} onChange={e => { upd(k, e.target.value); setErrors(er => ({...er, [k]: ""})); }} className={`bg-white/5 border-white/10 text-sm min-h-[60px] ${fieldError(errors, k) ? "border-red-500" : ""}`} />
              {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Logo URL</Label>
            <Input value={settings.receipt_logo_url || ""} onChange={e => upd("receipt_logo_url", e.target.value)} className="h-9 bg-white/5 border-white/10 text-sm" placeholder="https://..." />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contact &amp; Branding</h3>
          {[["tagline","Tagline"],["phone","Phone Number"],["address","Address"],["upi_id","UPI ID"]].map(([k,l]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{l}</Label>
              <Input value={settings[k]||""} onChange={e=>{ upd(k,e.target.value); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
              {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Paper Size</Label>
            <select value={settings.paper_size||"80mm"} onChange={e=>upd("paper_size",e.target.value)} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
              <option value="80mm">80mm (Standard)</option>
              <option value="57mm">57mm (Compact)</option>
              <option value="A4">A4 (Full Page)</option>
            </select>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Display Options</h3>
          <div className="grid grid-cols-2 gap-2">
          {[
            ["show_gst","Show GST Breakdown"],
            ["show_discount","Show Discount Line"],
            ["show_branch_address","Show Branch Address"],
            ["show_server_name","Show Server Name"],
            ["show_phone","Show Phone Number"],
            ["show_order_type","Show Order Type"],
            ["show_table_number","Show Table Number"],
            ["show_payment_method","Show Payment Method"],
            ["show_upi_qr","Show UPI QR Placeholder"],
          ].map(([k, l]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-white/5 col-span-1">
              <Label className="text-xs text-foreground">{l}</Label>
              <Switch checked={settings[k] ?? true} onCheckedChange={v => upd(k, v)} />
            </div>
          ))}
          </div>
        </div>
      </div>

      {showPreview && <ReceiptPreview settings={settings} onClose={() => setShowPreview(false)} />}
    </div>
  );
}