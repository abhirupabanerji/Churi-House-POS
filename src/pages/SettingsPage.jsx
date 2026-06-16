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
import { getCurrentUserBranch } from "@/lib/branchFilter";
import { fieldError, nonNegativeNumber, required } from "@/lib/formValidation";

const TABS = [
  { id: "general",  label: "General",          icon: Globe },
  { id: "theme",    label: "Theme",             icon: Palette },
  { id: "branding", label: "Branding",          icon: Brush },
  { id: "email",    label: "Email",             icon: Mail },
  { id: "payment",  label: "Payment Settings",  icon: CreditCard },
  { id: "backup",   label: "Backup & Restore",  icon: Database },
];

const THEME_COLORS = [
  { name: "Orange", primary: "#ea580c" },
  { name: "Blue",   primary: "#3b82f6" },
  { name: "Green",  primary: "#16a34a" },
  { name: "Purple", primary: "#9333ea" },
  { name: "Red",    primary: "#dc2626" },
  { name: "Teal",   primary: "#0d9488" },
];

const DEFAULT_SETTINGS = {
  restaurant_name:    "Churi House",
  branch_name:        "Main Branch — Jubilee Hills",
  phone:              "+91 98765 43210",
  gst_number:         "36AABCU9603R1ZM",
  address:            "Jubilee Hills, Hyderabad, Telangana - 500033",
  enable_gst:         true,
  show_price_with_tax: true,
  allow_order_edits:  true,
  theme_color:        "Orange",
  dark_mode:          true,
  compact_sidebar:    false,
  show_animations:    true,
  logo_url:           "",
  favicon_url:        "",
  tagline:            "Authentic Flavors, Every Bite",
  receipt_header:     "Thank you for dining with Churi House!",
  receipt_footer:     "Visit us again",
  show_logo_kds:      true,
  show_tagline_pos:   true,
  smtp_host: "", smtp_port: "587", from_email: "", from_name: "Churi House",
  smtp_user: "", smtp_pass: "",
  email_order_confirm: true, email_daily_summary: false, email_low_stock: true,
  pay_cash: true, pay_card: true, pay_upi: true, pay_online: false,
  tax_rate: "5", service_charge: "0", round_off: true, split_bill: true,
};

function mapFromEntity(rec) {
  return {
    restaurant_name:     rec.restaurant_name || rec.branch_name || DEFAULT_SETTINGS.restaurant_name,
    branch_name:         rec.branch_label    || rec.branch_name || DEFAULT_SETTINGS.branch_name,
    phone:               rec.phone           || DEFAULT_SETTINGS.phone,
    gst_number:          rec.gst_number      || DEFAULT_SETTINGS.gst_number,
    address:             rec.address         || DEFAULT_SETTINGS.address,
    receipt_header:      rec.receipt_header  || DEFAULT_SETTINGS.receipt_header,
    receipt_footer:      rec.receipt_footer  || DEFAULT_SETTINGS.receipt_footer,
    tagline:             rec.tagline         || DEFAULT_SETTINGS.tagline,
    logo_url:            rec.logo_url        || rec.receipt_logo_url || "",
    favicon_url:         rec.favicon_url     || "",
    theme_color:         rec.theme_color     || "Orange",
    dark_mode:           rec.dark_mode           !== undefined ? rec.dark_mode           : true,
    compact_sidebar:     rec.compact_sidebar     !== undefined ? rec.compact_sidebar     : false,
    show_animations:     rec.show_animations     !== undefined ? rec.show_animations     : true,
    enable_gst:          rec.show_gst            !== undefined ? rec.show_gst            : true,
    show_price_with_tax: rec.show_price_with_tax !== undefined ? rec.show_price_with_tax : true,
    allow_order_edits:   rec.allow_order_edits   !== undefined ? rec.allow_order_edits   : true,
    show_logo_kds:       rec.show_logo_kds       !== undefined ? rec.show_logo_kds       : true,
    show_tagline_pos:    rec.show_tagline_pos     !== undefined ? rec.show_tagline_pos    : true,
    pay_cash:            rec.pay_cash             !== undefined ? rec.pay_cash            : true,
    pay_card:            rec.pay_card             !== undefined ? rec.pay_card            : true,
    pay_upi:             rec.pay_upi              !== undefined ? rec.pay_upi             : true,
    pay_online:          rec.pay_online           || false,
    tax_rate:            rec.tax_rate             || DEFAULT_SETTINGS.tax_rate,
    service_charge:      rec.service_charge       || DEFAULT_SETTINGS.service_charge,
    round_off:           rec.round_off            !== undefined ? rec.round_off           : true,
    split_bill:          rec.split_bill           !== undefined ? rec.split_bill          : true,
    smtp_host:           rec.smtp_host            || "",
    smtp_port:           rec.smtp_port            || "587",
    smtp_user:           rec.smtp_user            || "",
    smtp_pass:           rec.smtp_pass            || "",
    from_email:          rec.from_email           || "",
    from_name:           rec.from_name            || "Churi House",
    email_low_stock:     rec.email_low_stock      !== undefined ? rec.email_low_stock     : true,
    email_order_confirm: rec.email_order_confirm  !== undefined ? rec.email_order_confirm : true,
    email_daily_summary: rec.email_daily_summary  || false,
  };
}

// ── Apply favicon to browser tab + persist ────────────────────────────────────
function applyFavicon(url) {
  if (!url) return;
  try {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
    localStorage.setItem("branding_favicon", url);
  } catch (e) {
    console.warn("Favicon apply failed:", e);
  }
}

// ── FileUploadField ───────────────────────────────────────────────────────────
function FileUploadField({ label, accept, currentUrl, onUpload, onRemove, uploading }) {
  const inputRef = useRef();
  const handleFile   = (e) => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = ""; };
  const handleRemove = () => { onRemove(); if (inputRef.current) inputRef.current.value = ""; };
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 glass rounded-xl border border-white/10">
          <img
            src={currentUrl} alt="preview"
            className="h-10 w-10 object-contain rounded-lg bg-white/5"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {currentUrl.startsWith("data:") ? "Uploaded image" : currentUrl.split("/").pop()}
          </span>
          <Button size="sm" variant="outline"
            className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            onClick={handleRemove}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-3 p-4 glass rounded-xl border border-dashed border-white/20 hover:border-primary/40 cursor-pointer transition-all group">
          {uploading
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          <div>
            <p className="text-xs font-medium text-foreground">{uploading ? "Uploading..." : "Click to upload"}</p>
            <p className="text-[10px] text-muted-foreground">{accept}</p>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isDark, setDark } = useTheme();
  const { branch: userBranch, isAllBranches } = getCurrentUserBranch();
  const currentBranchId = (!isAllBranches && userBranch)
    ? userBranch.toLowerCase().replace(/ /g, "_")
    : "main";

  const [tab, setTab]               = useState("general");
  const [settings, setSettings]     = useState({ ...DEFAULT_SETTINGS });
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState({ logo: false, favicon: false });
  const [errors, setErrors]         = useState({});
  const [backupFile, setBackupFile] = useState(null);
  const [restoring, setRestoring]   = useState(false);
  const [backingUp, setBackingUp]   = useState(false);

  // ── Restore branding from localStorage immediately on mount ────────────────
  useEffect(() => {
    const savedFavicon = localStorage.getItem("branding_favicon");
    if (savedFavicon) applyFavicon(savedFavicon);

    const savedLogo = localStorage.getItem("branding_logo");
    if (savedLogo) {
      setSettings(s => ({ ...s, logo_url: savedLogo }));
    }
  }, []);

  // ── Load settings from entity for the current branch only ─────────────
  useEffect(() => {
    base44.entities.BranchSettings.list().then(records => {
      const all = records || [];
      const current = all.find(r => r.branch_id === currentBranchId)
        || all.find(r => r.branch_name === userBranch)
        || all.find(r => r.branch_id === "main")
        || all[0];
      if (current) {
        setSettingsId(current.id);
        const mapped = mapFromEntity(current);
        setSettings(s => ({ ...s, ...mapped }));
        if (mapped.favicon_url) applyFavicon(mapped.favicon_url);
        if (mapped.logo_url) localStorage.setItem("branding_logo", mapped.logo_url);
      }
    }).catch(() => {});
  }, [currentBranchId, userBranch]);
  useEffect(() => {
  setSettings(s => ({ ...s, dark_mode: isDark }));
}, [isDark]);
  const update = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (tab === "general") {
      required(next, "restaurant_name", settings.restaurant_name);
      required(next, "branch_name",     settings.branch_name);
      required(next, "phone",           settings.phone);
      required(next, "gst_number",      settings.gst_number);
      required(next, "address",         settings.address);
    }
    if (tab === "email" && settings.smtp_host) {
      required(next, "smtp_port",   settings.smtp_port);
      required(next, "from_email",  settings.from_email);
      required(next, "from_name",   settings.from_name);
    }
    if (tab === "payment") {
      nonNegativeNumber(next, "tax_rate",       settings.tax_rate);
      nonNegativeNumber(next, "service_charge", settings.service_charge);
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };


  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entityData = {
        branch_id:           currentBranchId,
        restaurant_name:     settings.restaurant_name,
        branch_name:         (!isAllBranches && userBranch) ? userBranch : settings.restaurant_name,
        branch_label:        settings.branch_name,
        receipt_header:      settings.receipt_header,
        receipt_footer:      settings.receipt_footer,
        receipt_logo_url:    settings.logo_url,
        logo_url:            settings.logo_url,
        favicon_url:         settings.favicon_url,
        tagline:             settings.tagline,
        show_gst:            settings.enable_gst,
        theme_color:         settings.theme_color,
        dark_mode:           isDark,
        compact_sidebar:     settings.compact_sidebar,
        show_animations:     settings.show_animations,
        show_logo_kds:       settings.show_logo_kds,
        show_tagline_pos:    settings.show_tagline_pos,
        show_price_with_tax: settings.show_price_with_tax,
        allow_order_edits:   settings.allow_order_edits,
        phone:               settings.phone,
        gst_number:          settings.gst_number,
        address:             settings.address,
        pay_cash:            settings.pay_cash,
        pay_card:            settings.pay_card,
        pay_upi:             settings.pay_upi,
        pay_online:          settings.pay_online,
        tax_rate:            settings.tax_rate,
        service_charge:      settings.service_charge,
        round_off:           settings.round_off,
        split_bill:          settings.split_bill,
        smtp_host:           settings.smtp_host,
        smtp_port:           settings.smtp_port,
        smtp_user:           settings.smtp_user,
        smtp_pass:           settings.smtp_pass,
        from_email:          settings.from_email,
        from_name:           settings.from_name,
        email_low_stock:     settings.email_low_stock,
        email_order_confirm: settings.email_order_confirm,
        email_daily_summary: settings.email_daily_summary,
      };

      if (settingsId) {
        await base44.entities.BranchSettings.update(settingsId, entityData);
      } else {
        const rec = await base44.entities.BranchSettings.create(entityData);
        setSettingsId(rec.id);
      }

      applyTheme(settings);

      // Persist logo + favicon to localStorage so they survive navigation/refresh
      localStorage.setItem("branding_logo",    settings.logo_url    || "");
      localStorage.setItem("churi_settings", JSON.stringify({ ...settings, dark_mode: isDark }));
      
      if (settings.favicon_url) {
        applyFavicon(settings.favicon_url);
      } else {
        localStorage.removeItem("branding_favicon");
        const link = document.querySelector("link[rel~='icon']");
        if (link) link.href = "/favicon.ico";
      }

      toast.success("✅ Settings saved successfully!");
    } catch (err) {
      toast.error("❌ Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (field, file) => {
    setUploading(u => ({ ...u, [field]: true }));
    try {
      let fileUrl = "";
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal) {
        fileUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      } else {
        const response = await base44.integrations.Core.UploadFile({ file });
        fileUrl = response?.file_url || response?.url || response?.data?.url || response?.data?.file_url;
        if (!fileUrl) throw new Error("No URL returned from upload.");
      }

      const stateKey = field === "logo" ? "logo_url" : "favicon_url";
      update(stateKey, fileUrl);

      // Immediately persist to localStorage so it survives before Save is clicked
      if (field === "logo")    localStorage.setItem("branding_logo",    fileUrl);
      if (field === "favicon") applyFavicon(fileUrl);

      toast.success(`✅ ${field === "logo" ? "Logo" : "Favicon"} uploaded! Click Save to persist.`);
    } catch (err) {
      toast.error(`❌ Upload failed: ${err?.message || "Unknown error"}`);
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  };

  const testConnection = async () => {
    if (!settings.smtp_host || !settings.from_email) {
      toast.error("Please fill SMTP Host and From Email first.");
      return;
    }
    try {
      await base44.integrations.Core.SendEmail({
        to:         settings.from_email,
        subject:    "Test Connection — Churi House POS",
        body:       "<p>SMTP connection is working correctly. ✅</p>",
        smtp_host:  settings.smtp_host,
        smtp_port:  settings.smtp_port,
        smtp_user:  settings.smtp_user,
        smtp_pass:  settings.smtp_pass,
        from_email: settings.from_email,
        from_name:  settings.from_name,
      });
      toast.success("✅ Test email sent to " + settings.from_email);
    } catch (err) {
      toast.error("❌ Connection failed: " + (err?.message || "Unknown error"));
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const [orders, inventory, users, branches, branchSettings, attendance] = await Promise.all([
        base44.entities.Order.list("-created_date", 2000).catch(() => []),
        base44.entities.InventoryItem.list("name", 500).catch(() => []),
        base44.entities.User.list("full_name", 200).catch(() => []),
        base44.entities.Branch.list("name", 100).catch(() => []),
        base44.entities.BranchSettings.list().catch(() => []),
        base44.entities.Attendance.list("-created_date", 500).catch(() => []),
      ]);
      const backup = {
        version:    "1.0",
        created_at: new Date().toISOString(),
        restaurant: settings.restaurant_name,
        data:       { orders, inventory, users, branches, branchSettings, attendance },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `churihouse_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem("last_backup_date", new Date().toISOString());
      toast.success("✅ Backup downloaded successfully!");
    } catch (err) {
      toast.error("❌ Backup failed: " + (err?.message || "Unknown error"));
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!backupFile) { toast.error("Please select a backup file first."); return; }
    if (!confirm("⚠️ This will overwrite existing data. Are you sure?")) return;
    setRestoring(true);
    try {
      const text   = await backupFile.text();
      const backup = JSON.parse(text);
      if (!backup.version || !backup.data) throw new Error("Invalid backup file format.");
      const { inventory, branches, branchSettings, attendance } = backup.data;
      let restored = 0;
      for (const list of [branchSettings, inventory, branches, attendance]) {
        if (list?.length) {
          const entity =
            list === branchSettings ? base44.entities.BranchSettings
            : list === inventory    ? base44.entities.InventoryItem
            : list === branches     ? base44.entities.Branch
            :                         base44.entities.Attendance;
          for (const rec of list) {
            const { id, created_date, updated_date, ...data } = rec;
            await entity.create(data).catch(() => {});
            restored++;
          }
        }
      }
      toast.success(`✅ Restore complete! ${restored} records restored from backup created on ${new Date(backup.created_at).toLocaleDateString()}.`);
      setBackupFile(null);
    } catch (err) {
      toast.error("❌ Restore failed: " + (err?.message || "Invalid backup file"));
    } finally {
      setRestoring(false);
    }
  };

  const SaveBtn = () => (
    <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={save} disabled={saving}>
      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
    </Button>
  );

  const lastBackup = localStorage.getItem("last_backup_date");

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration &amp; preferences</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar tabs */}
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-52 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 glass rounded-2xl p-6 space-y-5">

          {/* ── General ─────────────────────────────────────────────────────── */}
          {tab === "general" && (
            <>
              <h3 className="text-base font-semibold text-foreground">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Restaurant Name *</Label>
                  <Input value={settings.restaurant_name} onChange={e => update("restaurant_name", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "restaurant_name") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "restaurant_name") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "restaurant_name")}</p>}
                </div>
                <div>
                  <Label>Branch Name *</Label>
                  <Input value={settings.branch_name} onChange={e => update("branch_name", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "branch_name") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "branch_name") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "branch_name")}</p>}
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input value={settings.phone} onChange={e => update("phone", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "phone") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "phone") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "phone")}</p>}
                </div>
                <div>
                  <Label>GST Number *</Label>
                  <Input value={settings.gst_number} onChange={e => update("gst_number", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "gst_number") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "gst_number") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "gst_number")}</p>}
                </div>
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input value={settings.address} onChange={e => update("address", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "address") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "address") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "address")}</p>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Enable GST</Label><Switch checked={settings.enable_gst} onCheckedChange={v => update("enable_gst", v)} /></div>
                <div className="flex items-center justify-between"><Label>Show Price with Tax</Label><Switch checked={settings.show_price_with_tax} onCheckedChange={v => update("show_price_with_tax", v)} /></div>
                <div className="flex items-center justify-between"><Label>Allow Order Edits</Label><Switch checked={settings.allow_order_edits} onCheckedChange={v => update("allow_order_edits", v)} /></div>
              </div>
            
            </>
          )}

          {/* ── Theme ───────────────────────────────────────────────────────── */}
          {tab === "theme" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Theme &amp; Appearance</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                    <div>
                      <Label>{isDark ? "Dark Mode" : "Light Mode"}</Label>
                      <p className="text-xs text-muted-foreground">Toggle between dark and light theme</p>
                    </div>
                  </div>
                  <Switch checked={isDark} onCheckedChange={v => { setDark(v); update("dark_mode", v); }} />
                </div>
                <div>
                  <Label className="mb-3 block">Primary Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {THEME_COLORS.map(c => (
                      <button key={c.name} onClick={() => update("theme_color", c.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          settings.theme_color === c.name ? "border-white/40 bg-white/10" : "border-white/10 hover:border-white/20"
                        }`}
                        style={settings.theme_color === c.name ? { outline: `2px solid ${c.primary}`, outlineOffset: "2px" } : {}}>
                        <div className="w-4 h-4 rounded-full relative flex items-center justify-center" style={{ background: c.primary }}>
                          {settings.theme_color === c.name && <Check className="w-3 h-3 text-white drop-shadow-md" strokeWidth={3} />}
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
           
            </>
          )}

          {/* ── Branding ────────────────────────────────────────────────────── */}
          {tab === "branding" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Branding</h3>
              <div className="glass rounded-xl p-4 space-y-4 border border-white/5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Logo &amp; Favicon</p>
                <FileUploadField
                  key={settings.logo_url ? `logo-${settings.logo_url.slice(-20)}` : "logo-empty"}
                  label="Restaurant Logo (PNG, JPG, SVG)"
                  accept=".png,.jpg,.jpeg,.svg"
                  currentUrl={settings.logo_url}
                  uploading={uploading.logo}
                  onUpload={(f) => uploadFile("logo", f)}
                  onRemove={() => {
                    update("logo_url", "");
                    localStorage.removeItem("branding_logo");
                  }}
                />
                <FileUploadField
                  key={settings.favicon_url ? `favicon-${settings.favicon_url.slice(-20)}` : "favicon-empty"}
                  label="Favicon (ICO, PNG) — applies to browser tab"
                  accept=".ico,.png"
                  currentUrl={settings.favicon_url}
                  uploading={uploading.favicon}
                  onUpload={(f) => uploadFile("favicon", f)}
                  onRemove={() => {
                    update("favicon_url", "");
                    localStorage.removeItem("branding_favicon");
                    const link = document.querySelector("link[rel~='icon']");
                    if (link) link.href = "/favicon.ico";
                  }}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Restaurant Tagline</Label>
                  <Input value={settings.tagline} onChange={e => update("tagline", e.target.value)} className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div>
                  <Label>Receipt Header</Label>
                  <Input value={settings.receipt_header} onChange={e => update("receipt_header", e.target.value)} className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div>
                  <Label>Receipt Footer</Label>
                  <Input value={settings.receipt_footer} onChange={e => update("receipt_footer", e.target.value)} className="bg-white/5 border-white/10 mt-1" />
                </div>
                <div className="flex items-center justify-between"><Label>Show Logo on KDS</Label><Switch checked={settings.show_logo_kds} onCheckedChange={v => update("show_logo_kds", v)} /></div>
                <div className="flex items-center justify-between"><Label>Show Tagline on POS</Label><Switch checked={settings.show_tagline_pos} onCheckedChange={v => update("show_tagline_pos", v)} /></div>
              </div>
           
            </>
          )}

          {/* ── Email ───────────────────────────────────────────────────────── */}
          {tab === "email" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Email Settings</h3>
              <div className="glass rounded-xl px-4 py-3 border border-white/10 text-xs text-muted-foreground">
                ℹ️ SMTP fields are optional. Leave blank to use the platform default mailer. Fill all fields to use a custom SMTP server.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>SMTP Host</Label><Input value={settings.smtp_host} onChange={e => update("smtp_host", e.target.value)} placeholder="smtp.gmail.com" className="bg-white/5 border-white/10 mt-1" /></div>
                <div>
                  <Label>SMTP Port</Label>
                  <Input value={settings.smtp_port} onChange={e => update("smtp_port", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "smtp_port") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "smtp_port") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "smtp_port")}</p>}
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input value={settings.from_email} onChange={e => update("from_email", e.target.value)} placeholder="noreply@churihouse.in"
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "from_email") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "from_email") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "from_email")}</p>}
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input value={settings.from_name} onChange={e => update("from_name", e.target.value)}
                    className={`bg-white/5 border-white/10 mt-1 ${fieldError(errors, "from_name") ? "border-red-500" : ""}`} />
                  {fieldError(errors, "from_name") && <p className="text-xs text-red-400 mt-1">{fieldError(errors, "from_name")}</p>}
                </div>
                <div><Label>SMTP Username</Label><Input value={settings.smtp_user} onChange={e => update("smtp_user", e.target.value)} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>SMTP Password</Label><Input type="password" value={settings.smtp_pass} onChange={e => update("smtp_pass", e.target.value)} placeholder="••••••••" className="bg-white/5 border-white/10 mt-1" /></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Send Order Confirmation</Label><Switch checked={settings.email_order_confirm} onCheckedChange={v => update("email_order_confirm", v)} /></div>
                <div className="flex items-center justify-between"><Label>Send Daily Summary</Label><Switch checked={settings.email_daily_summary} onCheckedChange={v => update("email_daily_summary", v)} /></div>
                <div className="flex items-center justify-between"><Label>Send Low Stock Alerts</Label><Switch checked={settings.email_low_stock} onCheckedChange={v => update("email_low_stock", v)} /></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="bg-white/5 border-white/10" onClick={testConnection}>Test Connection</Button>
             
              </div>
            </>
          )}

          {/* ── Payment ─────────────────────────────────────────────────────── */}
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
              
            </>
          )}

          {/* ── Backup ──────────────────────────────────────────────────────── */}
          {tab === "backup" && (
            <>
              <h3 className="text-base font-semibold text-foreground">Backup &amp; Restore</h3>
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Create Backup</p>
                  <p className="text-xs text-muted-foreground">Downloads a complete backup of orders, inventory, staff, branches and settings as a JSON file.</p>
                  {lastBackup && <p className="text-xs text-muted-foreground">Last backup: {new Date(lastBackup).toLocaleString("en-IN")}</p>}
                  <Button className="bg-primary hover:bg-primary/90" onClick={handleBackup} disabled={backingUp}>
                    {backingUp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Backing up...</> : "Download Backup"}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Auto Backup (Daily)</Label><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><Label>Include Media Files</Label><Switch /></div>
                  <div><Label>Backup Retention (days)</Label><Input defaultValue="30" type="number" className="bg-white/5 border-white/10 mt-1 max-w-xs" /></div>
                </div>
                <div className="glass rounded-xl p-4 space-y-3 border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-400">⚠️ Restore Data</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a <strong>.json</strong> backup file to restore your data. Existing records will not be deleted — restored records will be added alongside them.
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs">Select Backup File (.json)</Label>
                    <Input type="file" accept=".json" className="bg-white/5 border-white/10 text-sm" onChange={e => setBackupFile(e.target.files[0] || null)} />
                    {backupFile && <p className="text-xs text-green-400">✓ Selected: {backupFile.name}</p>}
                  </div>
                  <Button variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
                    onClick={handleRestore} disabled={!backupFile || restoring}>
                    {restoring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring...</> : "Restore from Backup"}
                  </Button>
                </div>
              </div>
            </>
          )}
          <div className="sticky bottom-0 left-0 right-0 z-30 flex justify-end">
            <div className="glass border-t border-white/10 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl">
              <p className="text-xs text-muted-foreground">
                This saves all modifications made in the Settings module.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90 glow-orange"
                onClick={save}
                disabled={saving || tab === "backup"}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}