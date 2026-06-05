import { useState } from "react";
import { Plug, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const INTEGRATIONS = [
  {
    name: "Swiggy", category: "Delivery", desc: "Connect your Swiggy restaurant account for live order sync.",
    config: [
      { key: "api_key", label: "API Key", placeholder: "swgy_live_xxxxxxxxxxxx", type: "password" },
      { key: "store_id", label: "Store ID", placeholder: "SWG_12345", type: "text" },
      { key: "restaurant_id", label: "Restaurant ID", placeholder: "res_98765", type: "text" },
      { key: "auto_accept", label: "Auto-accept Orders", type: "toggle" },
      { key: "webhook_url", label: "Webhook URL", placeholder: "https://...", type: "text" },
    ],
  },
  {
    name: "Zomato", category: "Delivery", desc: "Sync Zomato orders and manage your restaurant profile.",
    config: [
      { key: "api_key", label: "API Key", placeholder: "zmt_live_xxxxxxxxxxxx", type: "password" },
      { key: "res_id", label: "Restaurant ID", placeholder: "ZMT_54321", type: "text" },
      { key: "city_id", label: "City ID", placeholder: "e.g. 5 for Hyderabad", type: "text" },
      { key: "auto_accept", label: "Auto-accept Orders", type: "toggle" },
      { key: "menu_sync", label: "Auto Sync Menu Changes", type: "toggle" },
    ],
  },
  {
    name: "Razorpay", category: "Payments", desc: "Accept online payments via Razorpay payment gateway.",
    config: [
      { key: "key_id", label: "Key ID", placeholder: "rzp_live_xxxx", type: "text" },
      { key: "key_secret", label: "Key Secret", placeholder: "••••••••••••••••", type: "password" },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "wh_secret_xxx", type: "password" },
    ],
  },
  {
    name: "Paytm", category: "Payments", desc: "Enable Paytm QR and wallet payments for customers.",
    config: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "MCHNT_xxx", type: "text" },
      { key: "merchant_key", label: "Merchant Key", placeholder: "••••••••", type: "password" },
      { key: "website", label: "Website Name", placeholder: "DEFAULT", type: "text" },
      { key: "industry_type", label: "Industry Type", placeholder: "Retail", type: "text" },
      { key: "channel_id", label: "Channel ID", placeholder: "WEB", type: "text" },
      { key: "callback_url", label: "Callback URL", placeholder: "https://yoursite.com/paytm/callback", type: "text" },
      { key: "environment", label: "Environment", options: ["Staging", "Production"], type: "select" },
    ],
  },
  {
    name: "WhatsApp Business", category: "Notifications", desc: "Send order confirmations and alerts via WhatsApp.",
    config: [
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "1234567890", type: "text" },
      { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxx...", type: "password" },
      { key: "order_notify", label: "Order Confirmation Messages", type: "toggle" },
      { key: "low_stock", label: "Low Stock Alerts", type: "toggle" },
    ],
  },
  {
    name: "SMS Gateway", category: "Notifications", desc: "Send OTP and order alert SMS to customers.",
    config: [
      { key: "api_key", label: "API Key", placeholder: "sms_key_xxx", type: "password" },
      { key: "sender_id", label: "Sender ID", placeholder: "CHURIH", type: "text" },
      { key: "template_id", label: "Template ID", placeholder: "template_xxxx", type: "text" },
    ],
  },
  {
    name: "Thermal Printer", category: "Hardware", desc: "Print bills and KOTs via connected thermal printer.",
    config: [
      { key: "printer_ip", label: "Printer IP Address", placeholder: "192.168.1.100", type: "text" },
      { key: "port", label: "Port", placeholder: "9100", type: "text" },
      { key: "auto_print", label: "Auto-print on Order", type: "toggle" },
    ],
  },
  {
    name: "QR Ordering", category: "Hardware", desc: "Let customers scan a QR code to place orders.",
    config: [
      { key: "base_url", label: "Menu URL Base", placeholder: "https://menu.churihouse.in", type: "text" },
      { key: "table_count", label: "Number of Tables", placeholder: "20", type: "text" },
      { key: "qr_prefix", label: "QR Prefix", placeholder: "TBL", type: "text" },
    ],
  },
];

const categoryColors = {
  Delivery: "bg-green-500/10 text-green-400",
  Payments: "bg-primary/10 text-primary",
  Notifications: "bg-blue-500/10 text-blue-400",
  Hardware: "bg-purple-500/10 text-purple-400",
};

export default function Integrations() {
  const [enabled, setEnabled] = useState({ Swiggy: true, Zomato: true, Razorpay: true, Paytm: false, "WhatsApp Business": false, "SMS Gateway": true, "Thermal Printer": true, "QR Ordering": true });
  const [expanded, setExpanded] = useState({});
  const [configs, setConfigs] = useState({});
  const [saved, setSaved] = useState({});
  const [search, setSearch] = useState("");

  const toggle = (name) => setEnabled(e => ({ ...e, [name]: !e[name] }));
  const toggleExpand = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));
  const setConfig = (name, key, value) => setConfigs(c => ({ ...c, [name]: { ...(c[name] || {}), [key]: value } }));
  const saveConfig = (name) => {
    setSaved(s => ({ ...s, [name]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [name]: false })), 2000);
  };

  const filtered = INTEGRATIONS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground">Third-party connections &amp; configuration</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <input
          className="w-full h-10 pl-10 pr-3 rounded-md bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Search integrations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Plug className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>

      <div className="space-y-3">
        {filtered.map(item => {
          const isOn = !!enabled[item.name];
          const isOpen = !!expanded[item.name];
          const cfg = configs[item.name] || {};
          return (
            <div key={item.name} className={`glass rounded-2xl overflow-hidden transition-all ${isOn ? "border border-primary/20" : "border border-white/5"}`}>
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Plug className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${categoryColors[item.category]}`}>{item.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isOn && (
                    <button onClick={() => toggleExpand(item.name)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      Configure {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  <Switch checked={isOn} onCheckedChange={() => toggle(item.name)} />
                </div>
              </div>

              {isOn && isOpen && (
                <div className="border-t border-white/5 p-4 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Configuration</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.config.map(field => (
                      <div key={field.key} className={field.type === "toggle" ? "flex items-center justify-between col-span-1" : "space-y-1.5"}>
                        {field.type === "toggle" ? (
                          <>
                            <Label className="text-xs">{field.label}</Label>
                            <Switch checked={!!cfg[field.key]} onCheckedChange={v => setConfig(item.name, field.key, v)} />
                          </>
                        ) : field.type === "select" ? (
                          <div className="space-y-1.5 col-span-1">
                            <Label className="text-xs">{field.label}</Label>
                            <select value={cfg[field.key] || field.options[0]} onChange={e => setConfig(item.name, field.key, e.target.value)} className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        ) : (
                          <>
                            <Label className="text-xs">{field.label}</Label>
                            <Input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={cfg[field.key] || ""}
                              onChange={e => setConfig(item.name, field.key, e.target.value)}
                              className="h-9 bg-white/5 border-white/10 text-sm"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => saveConfig(item.name)}>
                      {saved[item.name] ? <><Check className="w-3 h-3 mr-1" /> Saved</> : "Save Configuration"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}