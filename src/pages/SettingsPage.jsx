import { useState, useEffect, useRef } from "react";
import { CreditCard, Palette, Brush, Database, Mail, Globe, Upload, X, Loader2, Sun, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { applyTheme } from "@/lib/themeManager";
import { useTheme } from "@/lib/ThemeContext";
import { fieldError, nonNegativeNumber, required } from "@/lib/formValidation";
const TABS = [
  { id: "general", label: "General", icon: Globe },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "branding", label: "Branding", icon: Brush },
  { id: "email", label: "Email", icon: Mail },
  { id: "payment", label: "Payment Settings", icon: CreditCard },
  { id: "backup", label: "Backup & Restore", icon: Database },
];

const THEME_COLORS = [
  { name: "Orange", primary: "#ea580c" },
  { name: "Blue", primary: "#3b82f6" },
  { name: "Green", primary: "#16a34a" },
  { name: "Purple", primary: "#9333ea" },
  { name: "Red", primary: "#dc2626" },
  { name: "Teal", primary: "#0d9488" },
];

const DEFAULT_SETTINGS = {
  restaurant_name: "Churi House",
  branch_name: "Main Branch — Jubilee Hills",
  phone: "+91 98765 43210",
  gst_number: "36AABCU9603R1ZM",
  address: "Jubilee Hills, Hyderabad, Telangana - 500033",
  enable_gst: true,
  show_price_with_tax: true,
  allow_order_edits: true,
  theme_color: "Orange",
  dark_mode: true,
  compact_sidebar: false,
  show_animations: true,
  logo_url: "",
  favicon_url: "",
  tagline: "Authentic Flavors, Every Bite",
  receipt_header: "Thank you for dining with Churi House!",
  receipt_footer: "Visit us again",
  show_logo_kds: true,
  show_tagline_pos: true,
  smtp_host: "", smtp_port: "587", from_email: "", from_name: "Churi House",
  smtp_user: "", smtp_pass: "",
  email_order_confirm: true, email_daily_summary: false, email_low_stock: true,
  pay_cash: true, pay_card: true, pay_upi: true, pay_online: false,
  tax_rate: "5", service_charge: "0", round_off: true, split_bill: true,
};

function mapFromEntity(rec) {
  return {
    restaurant_name: rec.branch_name || DEFAULT_SETTINGS.restaurant_name,
    receipt_header: rec.receipt_header || DEFAULT_SETTINGS.receipt_header,
    receipt_footer: rec.receipt_footer || DEFAULT_SETTINGS.receipt_footer,
    logo_url: rec.logo_url || rec.receipt_logo_url || "",
    favicon_url: rec.favicon_url || "",
    tagline: rec.tagline || DEFAULT_SETTINGS.tagline,
    theme_color: rec.theme_color || "Orange",
    dark_mode: rec.dark_mode !== undefined ? rec.dark_mode : true,
    compact_sidebar: rec.compact_sidebar || false,
    show_animations: rec.show_animations !== undefined ? rec.show_animations : true,
    enable_gst: rec.show_gst !== undefined ? rec.show_gst : true,
  };
}

function FileUploadField({ label, accept, currentUrl, onUpload, onRemove, uploading }) {
  const inputRef = useRef();
  const handleFile = (e) => { const f = e.target.files[0]; if (f) onUpload(f); };
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 glass rounded-xl border border-white/10">
          <img src={currentUrl} alt="" className="h-10 w-10 object-contain rounded-lg bg-white/5" />
          <span className="text-xs text-muted-foreground flex-1 truncate">{currentUrl.split("/").pop()}</span>
          <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={onRemove}><X className="w-3 h-3" /></Button>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()} className="flex items-center gap-3 p-4 glass rounded-xl border border-dashed border-white/20 hover:border-primary/40 cursor-pointer transition-all group">
          {uploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          <div><p className="text-xs font-medium text-foreground">Click to upload</p><p className="text-[10px] text-muted-foreground">{accept}</p></div>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function SettingsPage() {
  const { isDark, setDark } = useTheme();
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, favicon: false });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.entities.BranchSettings.list().then(records => {
      if (records[0]) {
        setSettingsId(records[0].id);
        const mapped = mapFromEntity(records[0]);
        setSettings(s => ({ ...s, ...mapped }));
      }
    }).catch(() => {});
  }, []);

  const update = (key, val) => { setSettings(s => ({ ...s, [key]: val })); setErrors(e => ({ ...e, [key]: "" })); };

  const validate = () => {
    const next = {};
    if (tab === "general") {
      required(next, "restaurant_name", settings.restaurant_name);
      required(next, "branch_name", settings.branch_name);
      required(next, "phone", settings.phone);
      required(next, "gst_number", settings.gst_number);
      required(next, "address", settings.address);
    }
    if (tab === "email") {
      required(next, "smtp_host", settings.smtp_host);
      required(next, "smtp_port", settings.smtp_port);
      required(next, "from_email", settings.from_email);
      required(next, "from_name", settings.from_name);
    }
    if (tab === "payment") {
      nonNegativeNumber(next, "tax_rate", settings.tax_rate);
      nonNegativeNumber(next, "service_charge", settings.service_charge);
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const entityData = {
      branch_id: "main",
      branch_name: settings.restaurant_name,
      receipt_header: settings.receipt_header,
      receipt_footer: settings.receipt_footer,
      receipt_logo_url: settings.logo_url,
      logo_url: settings.logo_url,
      favicon_url: settings.favicon_url,
      tagline: settings.tagline,
      show_gst: settings.enable_gst,
      theme_color: settings.theme_color,
      dark_mode: settings.dark_mode,
      compact_sidebar: settings.compact_sidebar,
      show_animations: settings.show_animations,
    };
    if (settingsId) {
      await base44.entities.BranchSettings.update(settingsId, entityData);
    } else {
      const rec = await base44.entities.BranchSettings.create(entityData);
      setSettingsId(rec.id);
    }
    applyTheme(settings);
    localStorage.setItem("branding_logo", settings.logo_url || "");
    localStorage.setItem("churi_settings", JSON.stringify(settings));
    setSaving(false);
    toast.success("Settings saved successfully!");
  };

  const uploadFile = async (field, file) => {
    setUploading(u => ({ ...u, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update(field === "logo" ? "logo_url" : "favicon_url", file_url);
    setUploading(u => ({ ...u, [field]: false }));
  };

  const SaveBtn = () => (
    <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={save} disabled={saving}>
      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
    </Button>
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration &amp; preferences</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-52 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 glass rounded-2xl p-6 space-y-5">

          {tab === "general" && (
            <>
              <h3 className="text-base font-semibold text-foreground">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Restaurant Name *</Label><Input value={settings.restaurant_name} onChange={e => update("restaurant_name", e.target.value)} className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "restaurant_name") ? "border-red-500" : ""}`} />{fieldError(errors, "restaurant_name") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "restaurant_name")}</p>}</div>
                <div><Label>Branch Name *</Label><Input value={settings.branch_name} onChange={e => update("branch_name", e.target.value)} className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "branch_name") ? "border-red-500" : ""}`} />{fieldError(errors, "branch_name") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "branch_name")}</p>}</div>
                <div><Label>Phone Number *</Label><Input value={settings.phone} onChange={e => update("phone", e.target.value)} className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "phone") ? "border-red-500" : ""}`} />{fieldError(errors, "phone") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "phone")}</p>}</div>
                <div><Label>GST Number *</Label><Input value={settings.gst_number} onChange={e => update("gst_number", e.target.value)} className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "gst_number") ? "border-red-500" : ""}`} />{fieldError(errors, "gst_number") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "gst_number")}</p>}</div>
                <div className="col-span-2"><Label>Address *</Label><Input value={settings.address} onChange={e => update("address", e.target.value)} className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "address") ? "border-red-500" : ""}`} />{fieldError(errors, "address") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "address")}</p>}</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Enable GST</Label><Switch checked={settings.enable_gst} onCheckedChange={v => update("enable_gst", v)} /></div>
                <div className="flex items-center justify-between"><Label>Show Price with Tax</Label><Switch checked={settings.show_price_with_tax} onCheckedChange={v => update("show_price_with_tax", v)} /></div>
                <div className="flex items-center justify-between"><Label>Allow Order Edits</Label><Switch checked={settings.allow_order_edits} onCheckedChange={v => update("allow_order_edits", v)} /></div>
              </div>
              <SaveBtn />
            </>
          )}

          {tab === "theme" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Theme &amp; Appearance</h3>
              <div className="space-y-5">
                {/* Dark / Light toggle */}
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                    <div>
                      <Label>{isDark ? "Dark Mode" : "Light Mode"}</Label>
                      <p className="text-xs text-muted-foreground">Toggle between dark and light theme</p>
                    </div>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={v => {
                      setDark(v);
                      update("dark_mode", v);
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-3 block">Primary Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {THEME_COLORS.map(c => (
  <button key={c.name} onClick={() => update("theme_color", c.name)}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${settings.theme_color === c.name ? "border-white/40 bg-white/10" : "border-white/10 hover:border-white/20"}`}
    style={settings.theme_color === c.name ? { outline: `2px solid ${c.primary}`, outlineOffset: "2px" } : {}}>
    <div className="w-4 h-4 rounded-full relative flex items-center justify-center" style={{ background: c.primary }}>
      {settings.theme_color === c.name && (
        <Check className="w-3 h-3 text-white drop-shadow-md" strokeWidth={3} />
      )}
    </div>
    {c.name}
  </button>
))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Changes are applied system-wide on save.</p>
                </div>
                <div className="flex items-center justify-between"><Label>Sidebar Compact Mode</Label><Switch checked={settings.compact_sidebar} onCheckedChange={v => update("compact_sidebar", v)} /></div>
                <div className="flex items-center justify-between"><Label>Show Animations</Label><Switch checked={settings.show_animations} onCheckedChange={v => update("show_animations", v)} /></div>
              </div>
              <SaveBtn />
            </>
          )}

          {tab === "branding" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Branding</h3>
              <div className="glass rounded-xl p-4 space-y-4 border border-white/5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Logo &amp; Favicon</p>
                <FileUploadField label="Restaurant Logo (PNG, JPG, SVG)" accept=".png,.jpg,.jpeg,.svg"
                  currentUrl={settings.logo_url} uploading={uploading.logo}
                  onUpload={(f) => uploadFile("logo", f)}
                  onRemove={() => { update("logo_url", ""); localStorage.setItem("branding_logo", ""); }} />
                <FileUploadField label="Favicon (ICO, PNG)" accept=".ico,.png"
                  currentUrl={settings.favicon_url} uploading={uploading.favicon}
                  onUpload={(f) => uploadFile("favicon", f)}
                  onRemove={() => update("favicon_url", "")} />
              </div>
              <div className="space-y-4">
                <div><Label>Restaurant Tagline</Label><Input value={settings.tagline} onChange={e => update("tagline", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>Receipt Header Text</Label><Input value={settings.receipt_header} onChange={e => update("receipt_header", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>Receipt Footer Text</Label><Input value={settings.receipt_footer} onChange={e => update("receipt_footer", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div className="flex items-center justify-between"><Label>Show Logo on KDS</Label><Switch checked={settings.show_logo_kds} onCheckedChange={v => update("show_logo_kds", v)} /></div>
                <div className="flex items-center justify-between"><Label>Show Tagline on POS</Label><Switch checked={settings.show_tagline_pos} onCheckedChange={v => update("show_tagline_pos", v)} /></div>
              </div>
              <SaveBtn />
            </>
          )}

          {tab === "email" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Email Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>SMTP Host</Label><Input value={settings.smtp_host} onChange={e => update("smtp_host", e.target.value)} placeholder="smtp.gmail.com" className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>SMTP Port</Label><Input value={settings.smtp_port} onChange={e => update("smtp_port", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>From Email</Label><Input value={settings.from_email} onChange={e => update("from_email", e.target.value)} placeholder="noreply@churihouse.in" className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>From Name</Label><Input value={settings.from_name} onChange={e => update("from_name", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>SMTP Username</Label><Input value={settings.smtp_user} onChange={e => update("smtp_user", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>SMTP Password</Label><Input type="password" value={settings.smtp_pass} onChange={e => update("smtp_pass", e.target.value)} placeholder="••••••••" className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Send Order Confirmation</Label><Switch checked={settings.email_order_confirm} onCheckedChange={v => update("email_order_confirm", v)} /></div>
                <div className="flex items-center justify-between"><Label>Send Daily Summary</Label><Switch checked={settings.email_daily_summary} onCheckedChange={v => update("email_daily_summary", v)} /></div>
                <div className="flex items-center justify-between"><Label>Send Low Stock Alerts</Label><Switch checked={settings.email_low_stock} onCheckedChange={v => update("email_low_stock", v)} /></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="bg-white/5 border-white/10">Test Connection</Button>
                <SaveBtn />
              </div>
            </>
          )}

          {tab === "payment" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Payment Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3"><Label>Cash Payments</Label><Switch checked={settings.pay_cash} onCheckedChange={v => update("pay_cash", v)} /></div>
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3"><Label>Card Payments</Label><Switch checked={settings.pay_card} onCheckedChange={v => update("pay_card", v)} /></div>
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3"><Label>UPI Payments</Label><Switch checked={settings.pay_upi} onCheckedChange={v => update("pay_upi", v)} /></div>
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3"><Label>Online / Wallet Payments</Label><Switch checked={settings.pay_online} onCheckedChange={v => update("pay_online", v)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Default Tax Rate (%)</Label><Input type="number" value={settings.tax_rate} onChange={e => update("tax_rate", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>Service Charge (%)</Label><Input type="number" value={settings.service_charge} onChange={e => update("service_charge", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Round Off Total</Label><Switch checked={settings.round_off} onCheckedChange={v => update("round_off", v)} /></div>
                <div className="flex items-center justify-between"><Label>Allow Split Bill</Label><Switch checked={settings.split_bill} onCheckedChange={v => update("split_bill", v)} /></div>
              </div>
              <SaveBtn />
            </>
          )}

          {tab === "backup" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Backup &amp; Restore</h3>
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Last Backup</p>
                  <p className="text-xs text-muted-foreground">Today, 06:00 AM — Automatic</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">Download Backup</Button>
                    <Button size="sm" variant="outline" className="bg-white/5 border-white/10">Backup Now</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Auto Backup (Daily)</Label><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><Label>Include Media Files</Label><Switch /></div>
                  <div><Label>Backup Retention (days)</Label><Input defaultValue="30" type="number" className="bg-white/5 border-white/10 mt-1 max-w-xs" /></div>
                </div>
                <div className="glass rounded-xl p-4 space-y-3 border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-400">Restore Data</p>
                  <p className="text-xs text-muted-foreground">Upload a backup file to restore your data. This will overwrite current data.</p>
                  <Input type="file" className="bg-white/5 border-white/10 text-sm" />
                  <Button size="sm" variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400">Restore from Backup</Button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}