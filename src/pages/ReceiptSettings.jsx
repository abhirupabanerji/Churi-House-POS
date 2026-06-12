import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Eye, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ReceiptPreview from "@/components/ReceiptPreview";
import { fieldError, required } from "@/lib/formValidation";
import { toast } from "sonner";

const LS_BRANCHES_KEY = "ch_Branch";

function loadBranchNames() {
  try {
    const rows = JSON.parse(localStorage.getItem(LS_BRANCHES_KEY) || "[]");
    const names = rows.map(b => b.name).filter(Boolean);
    return names.length > 0 ? names : ["Main Branch"];
  } catch { return ["Main Branch"]; }
}

const defaultSettings = (branch) => ({
  branch_name: branch,
  branch_id: branch.toLowerCase().replace(/ /g, "_"),
  receipt_header: `Churi House — ${branch}`,
  receipt_footer: "Thank you for dining with us!",
  receipt_note: "Visit us again • www.churihouse.com",
  tagline: "Taste the Tradition",
  phone: "+91 90000 00000",
  address: "Hyderabad, Telangana",
  upi_id: "churihouse@upi",
  gst_number: "",
  fssai_number: "",
  receipt_logo_url: "",
  receipt_qr_url: "",
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
  show_gst_number: true,
  show_fssai_number: true,
  show_logo: true,
});

export default function ReceiptSettings() {
  const [branches, setBranches] = useState(loadBranchNames());
  const [selectedBranch, setSelectedBranch] = useState(loadBranchNames()[0]);
  const [settings, setSettings] = useState(defaultSettings(loadBranchNames()[0]));
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const logoInputRef = useRef(null);
  const qrInputRef = useRef(null);

  // Load branches from Branch entity on mount
  useEffect(() => {
    base44.entities.Branch.list("name", 100)
      .then(data => {
        const names = (data || []).map(b => b.name).filter(Boolean);
        if (names.length > 0) {
          setBranches(names);
          setSelectedBranch(names[0]);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.BranchSettings.list("branch_name", 100)
      .then(existing => {
        const general = existing.find(r => r.branch_id === "main") || existing[0];
        const match = existing.find(r => r.branch_name === selectedBranch) || general;
        const merged = {
          ...defaultSettings(selectedBranch),
          ...match,
          restaurant_name: general?.branch_name || match?.restaurant_name || match?.branch_name || "Churi House",
          branch_name: general?.branch_label || match?.branch_label || selectedBranch,
          branch_label: general?.branch_label || match?.branch_label || selectedBranch,
        };
        setSettings(merged);
      }).catch(() => setSettings(defaultSettings(selectedBranch)));
  }, [selectedBranch]);

  const validate = () => {
    const next = {};
    required(next, "receipt_header", settings.receipt_header);
    required(next, "receipt_footer", settings.receipt_footer);
    required(next, "phone", settings.phone);
    required(next, "address", settings.address);

    if (settings.gst_number && settings.gst_number.replace(/\s+/g, "").length !== 15) {
      next.gst_number = "GST number must be 15 characters";
    }

    if (settings.fssai_number && settings.fssai_number.replace(/\D/g, "").length !== 14) {
      next.fssai_number = "FSSAI number must be 14 digits";
    }

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
      toast.success("✅ Receipt settings saved successfully.");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("❌ Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // Convert logo to base64 and store
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error("Logo must be under 500KB"); return; }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      upd("receipt_logo_url", ev.target.result);
      setLogoUploading(false);
      toast.success("Logo uploaded — click Save to apply.");
    };
    reader.onerror = () => { toast.error("Failed to read file."); setLogoUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("QR must be under 500KB");
      return;
    }

    setQrUploading(true);
    const reader = new FileReader();

    reader.onload = (ev) => {
      const dataUrl = typeof ev.target?.result === "string" ? ev.target.result : "";
      if (dataUrl) {
        upd("receipt_qr_url", dataUrl);
        toast.success("QR uploaded — click Save to apply.");
      } else {
        toast.error("Failed to read QR file.");
      }
      setQrUploading(false);
      if (e.target) e.target.value = "";
    };

    reader.onerror = () => {
      toast.error("Failed to read QR file.");
      setQrUploading(false);
      if (e.target) e.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  const upd = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receipt Settings</h1>
          <p className="text-sm text-muted-foreground">Customize receipt per branch</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white/5 border-white/10" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Branch tabs */}
      <div className="flex gap-2 flex-wrap">
        {branches.map(b => (
          <button key={b} onClick={() => setSelectedBranch(b)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${selectedBranch === b ? "bg-primary text-primary-foreground glow-orange" : "glass text-muted-foreground hover:text-foreground"}`}>
            {b}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Column 1 — Header, Footer, Logo */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Header &amp; Footer</h3>

          {[["receipt_header","Receipt Header *"],["receipt_footer","Footer Text *"],["receipt_note","Custom Note"]].map(([k,l]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{l}</Label>
              <Textarea value={settings[k] || ""} onChange={e => { upd(k, e.target.value); setErrors(er => ({...er,[k]:""})); }}
                className={`bg-white/5 border-white/10 text-sm min-h-[60px] ${fieldError(errors,k) ? "border-red-500" : ""}`} />
              {fieldError(errors,k) && <p className="text-xs text-red-400">{fieldError(errors,k)}</p>}
            </div>
          ))}

          {/* Logo upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Receipt Logo</Label>
            {settings.receipt_logo_url ? (
              <div className="relative inline-block">
                <img src={settings.receipt_logo_url} alt="Logo"
                  className="h-16 w-auto rounded-lg border border-white/10 object-contain bg-white/5 p-1" />
                <button onClick={() => upd("receipt_logo_url", "")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 w-full h-16 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all justify-center text-muted-foreground text-xs">
                {logoUploading ? <span>Uploading...</span> : <><Upload className="w-4 h-4" /> Click to upload logo</>}
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG · max 500KB · stored as base64</p>
          </div>

        

          {/* QR upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Receipt QR Code</Label>
            {settings.receipt_qr_url ? (
              <div className="relative inline-block">
                <img src={settings.receipt_qr_url} alt="QR"
                  className="h-16 w-16 rounded-lg border border-white/10 object-contain bg-white p-1" />
                <button onClick={() => upd("receipt_qr_url", "")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => qrInputRef.current?.click()}
                className="flex items-center gap-2 w-full h-16 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all justify-center text-muted-foreground text-xs">
                {qrUploading ? <span>Uploading...</span> : <><Upload className="w-4 h-4" /> Click to upload QR</>}
              </button>
            )}
            <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
            <p className="text-[10px] text-muted-foreground">PNG or JPG · max 500KB · shown on receipt when enabled</p>
          </div>
        </div>

        {/* Column 2 — Contact, Branding, GST, FSSAI */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contact &amp; Branding</h3>

          {[
            ["tagline","Tagline"],
            ["phone","Phone Number *"],
            ["address","Address *"],
            ["upi_id","UPI ID"],
          ].map(([k,l]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{l}</Label>
              <Input value={settings[k]||""} onChange={e=>{ upd(k,e.target.value); setErrors(er=>({...er,[k]:""})); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors,k) ? "border-red-500" : ""}`} />
              {fieldError(errors,k) && <p className="text-xs text-red-400">{fieldError(errors,k)}</p>}
            </div>
          ))}

          {/* GST Number */}
          <div className="space-y-1.5">
            <Label className="text-xs">GST Number</Label>
            <Input
              value={settings.gst_number || ""}
              onChange={e => {
                upd("gst_number", e.target.value.toUpperCase());
                setErrors(er => ({ ...er, gst_number: "" }));
              }}
              placeholder="e.g. 36AAACH7409R1ZZ"
              maxLength={15}
              className={`h-9 bg-white/5 border-white/10 text-sm font-mono tracking-wider ${fieldError(errors, "gst_number") ? "border-red-500" : ""}`}
            />
            {fieldError(errors, "gst_number") && <p className="text-xs text-red-400">{fieldError(errors, "gst_number")}</p>}
            <p className="text-[10px] text-muted-foreground">15-character GSTIN</p>
          </div>

          {/* FSSAI Number */}
          <div className="space-y-1.5">
            <Label className="text-xs">FSSAI License Number</Label>
            <Input
              value={settings.fssai_number || ""}
              onChange={e => {
                upd("fssai_number", e.target.value.replace(/\D/g, "").slice(0, 14));
                setErrors(er => ({ ...er, fssai_number: "" }));
              }}
              placeholder="e.g. 10019022000015"
              maxLength={14}
              className={`h-9 bg-white/5 border-white/10 text-sm font-mono tracking-wider ${fieldError(errors, "fssai_number") ? "border-red-500" : ""}`}
            />
            {fieldError(errors, "fssai_number") && <p className="text-xs text-red-400">{fieldError(errors, "fssai_number")}</p>}
            <p className="text-[10px] text-muted-foreground">14-digit FSSAI number</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Paper Size</Label>
            <select value={settings.paper_size||"80mm"} onChange={e=>upd("paper_size",e.target.value)}
              className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
              <option value="80mm">80mm (Standard)</option>
              <option value="57mm">57mm (Compact)</option>
              <option value="A4">A4 (Full Page)</option>
            </select>
          </div>
        </div>

        {/* Column 3 — Display Options */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Display Options</h3>
          <div className="space-y-0.5">
            {[
              ["show_logo",           "Show Logo on Receipt"],
              ["show_gst",            "Show GST Breakdown"],
              ["show_gst_number",     "Show GST Number"],
              ["show_fssai_number",   "Show FSSAI Number"],
              ["show_discount",       "Show Discount Line"],
              ["show_branch_address", "Show Branch Address"],
              ["show_server_name",    "Show Server Name"],
              ["show_phone",          "Show Phone Number"],
              ["show_order_type",     "Show Order Type"],
              ["show_table_number",   "Show Table Number"],
              ["show_payment_method", "Show Payment Method"],
              ["show_upi_qr",         "Show QR on Receipt"],
            ].map(([k, l]) => (
              <div key={k} className="flex items-center justify-between py-2.5 border-b border-white/5">
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
