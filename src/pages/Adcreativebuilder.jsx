import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Download, RefreshCw, ChevronDown, Palette, Type, Layout, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TEMPLATES = [
  { id: "crave",   label: "Craving?" },
  { id: "special", label: "Today's Special" },
  { id: "bold",    label: "Bold Feature" },
  { id: "minimal", label: "Minimal Elegant" },
];

const ACCENT_COLORS = [
  { label: "Churi Red", bg: "#7B1818", accent: "#E8A020", text: "#fff" },
  { label: "Saffron",   bg: "#C24B00", accent: "#FFD700", text: "#fff" },
  { label: "Forest",    bg: "#1A3C2B", accent: "#7EC850", text: "#fff" },
  { label: "Midnight",  bg: "#0D1B2A", accent: "#F97316", text: "#fff" },
  { label: "Rose Gold", bg: "#2D1B1B", accent: "#E8B4A0", text: "#fff" },
];

const DEFAULT_FORM = {
  headline:     "Craving",
  subheadline:  "Creamy Pasta?",
  tagline:      "Pure Comfort, Pure Delight!",
  description:  "Rich, velvety sauces. Perfectly cooked pasta.",
  bullet1:      "Rich & Creamy Flavors",
  bullet2:      "Premium Ingredients",
  bullet3:      "Freshly Made For You",
  cta:          "Treat Yourself TODAY!",
  phone:        "9800003447",
  website:      "www.churihouse.com",
  social:       "@churihouseindia",
  brandName:    "CHURI HOUSE",
  brandTagline: "The Tradition and The Taste",
};

function PosterCanvas({ form, template, palette, itemImageUrl, brandLogoUrl }) {
  const W = 800, H = 1000;

  if (template === "crave") {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <radialGradient id="bgGrad" cx="30%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#f5ede8" />
          </radialGradient>
          <clipPath id="circleClip">
            <circle cx="540" cy="550" r="250" />
          </clipPath>
          <clipPath id="logoClip">
            <circle cx="80" cy="80" r="52" />
          </clipPath>
          <filter id="shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="rgba(0,0,0,0.18)" />
          </filter>
          <filter id="softShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.12)" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#bgGrad)" />
        <path d={`M ${W} 0 Q ${W-80} 250 ${W} 550 L ${W} 0Z`} fill={palette.bg} opacity="0.92" />
        <path d={`M ${W-35} 0 Q ${W-120} 240 ${W-35} 530 L ${W} 0Z`} fill={palette.accent} opacity="0.45" />

        {/* Top-left logo circle */}
        <circle cx="80" cy="80" r="58" fill={palette.bg} filter="url(#softShadow)" />
        <circle cx="80" cy="80" r="52" fill={palette.bg} />
        <circle cx="80" cy="80" r="50" fill="none" stroke={palette.accent} strokeWidth="2.5" />
        {brandLogoUrl ? (
          <image href={brandLogoUrl} x="26" y="22" width="108" height="114" clipPath="url(#logoClip)" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <text x="80" y="74" textAnchor="middle" fill={palette.accent} fontSize="13" fontWeight="900" fontFamily="serif" >{form.brandName}</text>
            <text x="80" y="91" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7.5" fontFamily="sans-serif">{form.brandTagline}</text>
          </>
        )}

        {[...Array(9)].map((_, i) => (
          <circle key={i} cx={620 + (i % 3) * 20} cy={55 + Math.floor(i / 3) * 20} r="3.5" fill={palette.accent} opacity="0.55" />
        ))}

        {/* Headline */}
        <text x="55" y="210" fontFamily="Georgia,serif" fontSize="38" fill={palette.bg} fontStyle="italic" opacity="0.9">{form.headline}</text>
        <text x="55" y="288" fontFamily="Georgia,serif" fontSize="74" fontWeight="900" fill={palette.bg} letterSpacing="-1">{form.subheadline.split(" ")[0]}</text>
        <text x="55" y="370" fontFamily="Georgia,serif" fontSize="74" fontWeight="900" fill={palette.accent} letterSpacing="-1">{form.subheadline.split(" ").slice(1).join(" ")}</text>

        <text x="55" y="418" fontFamily="Georgia,serif" fontSize="22" fontStyle="italic" fill={palette.bg} opacity="0.8">{form.tagline.split(",")[0] + ","}</text>
        <text x="55" y="445" fontFamily="Georgia,serif" fontSize="22" fontStyle="italic" fill={palette.bg} opacity="0.8">{form.tagline.split(",").slice(1).join(",").trim()}</text>
        <line x1="55" x2="210" y1="457" y2="457" stroke={palette.accent} strokeWidth="1.5" opacity="0.7" />

        {/* Food image */}
        <circle cx="540" cy="550" r="250" fill={palette.bg} opacity="0.07" filter="url(#shadow)" />
        {itemImageUrl ? (
          <image href={itemImageUrl} x="270" y="280" width="550" height="550" clipPath="url(#circleClip)" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <circle cx="540" cy="550" r="250" fill={palette.accent} opacity="0.08" />
            <text x="540" y="550" textAnchor="middle" fontSize="80" fill={palette.bg} opacity="0.12">🍽️</text>
            <text x="540" y="600" textAnchor="middle" fontSize="14" fill={palette.bg} opacity="0.3" fontFamily="sans-serif">Upload item image to preview</text>
          </>
        )}

        <text x="55" y="488" fontFamily="sans-serif" fontSize="16" fill="#555">{form.description.split(" ").slice(0, 4).join(" ")}</text>
        <text x="55" y="508" fontFamily="sans-serif" fontSize="16" fill="#555">{form.description.split(" ").slice(4, 8).join(" ")}</text>

        {[form.bullet1, form.bullet2, form.bullet3].map((b, i) => (
          <g key={i} transform={`translate(55, ${548 + i * 54})`}>
            <circle cx="20" cy="20" r="15" fill={palette.bg} />
            <circle cx="20" cy="20" r="7" fill={palette.accent} />
            <text x="45" y="15" fontFamily="sans-serif" fontSize="16" fontWeight="700" fill="#1a1a1a">{b.split(" ").slice(0, 3).join(" ")}</text>
            <text x="45" y="32" fontFamily="sans-serif" fontSize="15" fill="#555">{b.split(" ").slice(3).join(" ")}</text>
          </g>
        ))}

        <rect x="55" y="758" width="260" height="65" rx="10" fill={palette.accent} filter="url(#softShadow)" />
        <text x="185" y="784" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontStyle="italic" fill="#fff">{form.cta.split(" ").slice(0, 2).join(" ")}</text>
        <text x="185" y="813" textAnchor="middle" fontFamily="sans-serif" fontSize="24" fontWeight="900" fill="#fff">{form.cta.split(" ").slice(2).join(" ")}</text>

        {[...Array(6)].map((_, i) => (
          <circle key={i} cx={55 + (i % 3) * 16} cy={843 + Math.floor(i / 3) * 16} r="3" fill={palette.accent} opacity="0.45" />
        ))}

        {/* Footer */}
        <rect x="0" y="876" width={W} height="124" fill={palette.bg} />
        <rect x="80" y="890" width={W - 160} height="38" rx="19" fill="rgba(255,255,255,0.13)" />
        <text x={W / 2} y="915" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fontWeight="700" fill="#fff" letterSpacing="2">CONTACT US TODAY TO KNOW MORE!</text>
        {/* Phone + website spaced on same row */}
        <text x="150" y="950" fontFamily="sans-serif" fontSize="15" fill="#fff">📞 {form.phone}</text>
        <text x="500" y="950" fontFamily="sans-serif" fontSize="15" fill="#fff">🌐 {form.website}</text>
        {/* Social on its own row */}
        <text x={W / 2} y="980" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.65)">Follow Us: 📷 📘 {form.social}</text>
      </svg>
    );
  }

  if (template === "special") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs><clipPath id="logoClipSp"><circle cx="80" cy="80" r="55" /></clipPath></defs>
        <rect width={W} height={H} fill={palette.bg} />
        <rect x="0" y="0" width={W} height="300" fill={palette.accent} opacity="0.15" />
        <circle cx="80" cy="80" r="55" fill="rgba(255,255,255,0.12)" />
        <circle cx="80" cy="80" r="57" fill="none" stroke={palette.accent} strokeWidth="5" />
        {brandLogoUrl
          ? <image href={brandLogoUrl} x="26" y="22" width="108" height="114" clipPath="url(#logoClipSp)" preserveAspectRatio="xMidYMid slice" />
          : <text x="80" y="85" textAnchor="middle" fontFamily="serif" fontSize="12" fontWeight="900" fill={palette.accent} letterSpacing="1">{form.brandName}</text>
        }
        <text x={W / 2} y="115" textAnchor="middle" fontFamily="sans-serif" fontSize="25" fontWeight="700" fill={palette.accent} letterSpacing="6">TODAY'S SPECIAL</text>
        <text x={W / 2} y="192" textAnchor="middle" fontFamily="Georgia,serif" fontSize="60" fontWeight="900" fill="#fff">{form.subheadline}</text>
        <text x={W / 2} y="236" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontStyle="italic" fill={palette.accent}>{form.tagline}</text>
        {itemImageUrl
          ? <image href={itemImageUrl} x="80" y="265" width="640" height="410" preserveAspectRatio="xMidYMid slice" />
          : <rect x="80" y="265" width="640" height="410" rx="16" fill={palette.accent} opacity="0.1" />
        }
        <text x={W / 2} y="732" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="#fff" opacity="0.85">{form.description}</text>
        <rect x="200" y="758" width="400" height="52" rx="26" fill={palette.accent} />
        <text x={W / 2} y="791" textAnchor="middle" fontFamily="sans-serif" fontSize="19" fontWeight="800" fill="#fff">{form.cta}</text>
        <line x1="60" x2="740" y1="842" y2="842" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="150" y="880" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.7)">📞 {form.phone}</text>
        <text x="500" y="880" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.7)">🌐 {form.website}</text>
        <text x={W / 2} y="920" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.45)">Follow Us: 📷 📘{form.social}</text>
      </svg>
    );
  }

  if (template === "bold") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111" stopOpacity="0" />
            <stop offset="100%" stopColor="#111" stopOpacity="1" />
          </linearGradient>
          <clipPath id="logoClipBold"><circle cx="80" cy="80" r="55" /></clipPath>
        </defs>
        <rect width={W} height={H} fill="#111" />
        <rect x="0" y="0" width="8" height={H} fill={palette.accent} />
        {itemImageUrl
          ? <image href={itemImageUrl} x="0" y="0" width={W} height="460" preserveAspectRatio="xMidYMid slice" opacity="0.45" />
          : <rect x="0" y="0" width={W} height="460" fill={palette.bg} opacity="0.3" />
        }
        <rect x="0" y="360" width={W} height="120" fill="url(#fadeDown)" />
        <circle cx="80" cy="80" r="55" fill="rgba(0,0,0,0.55)" />
        <circle cx="80" cy="80" r="57" fill="none" stroke={palette.accent} strokeWidth="5" />
        {brandLogoUrl
          ? <image href={brandLogoUrl} x="26" y="22" width="108" height="114" clipPath="url(#logoClipBold)" preserveAspectRatio="xMidYMid slice" />
          : <text x="80" y="85" textAnchor="middle" fontSize="12" fontWeight="900" fill={palette.accent} fontFamily="serif" letterSpacing="0.5">{form.brandName}</text>
        }
        <text x="60" y="520" fontFamily="sans-serif" fontSize="20" fontWeight="700" fill={palette.accent} letterSpacing="5">{form.headline.toUpperCase()}</text>
        <text x="60" y="600" fontFamily="Georgia,serif" fontSize="68" fontWeight="900" fill="#fff">{form.subheadline}</text>
        <text x="60" y="642" fontFamily="sans-serif" fontSize="17" fill="rgba(255,255,255,0.55)">{form.description}</text>
        <line x1="60" x2="160" y1="670" y2="670" stroke={palette.accent} strokeWidth="2" />
        {[form.bullet1, form.bullet2, form.bullet3].map((b, i) => (
          <text key={i} x="60" y={710 + i * 36} fontFamily="sans-serif" fontSize="19" fill="rgba(255,255,255,0.75)">→  {b}</text>
        ))}
        <rect x="60" y="840" width="280" height="50" rx="6" fill={palette.accent} />
        <text x="200" y="871" textAnchor="middle" fontFamily="sans-serif" fontSize="18" fontWeight="800" fill="#fff">{form.cta}</text>
        <text x="250" y="924" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.4)">📞 {form.phone}</text>
        <text x="400" y="924" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.4)">🌐 {form.website}</text>
        <text x="300" y="964" fontFamily="sans-serif" fontSize="15" fill="rgba(255,255,255,0.3)">Follow Us: 📷 📘{form.social}</text>
      </svg>
    );
  }

  {/* Minimal template layout */}
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs><clipPath id="logoClipMin"><circle cx="80" cy="80" r="55" /></clipPath></defs>
      <rect width={W} height={H} fill="#faf9f7" />
      <rect x="60" y="60" width={W - 120} height={H - 120} fill="none" stroke={palette.bg} strokeWidth="1.5" opacity="0.15" />
      <circle cx="80" cy="80" r="55" fill={palette.bg} opacity="0.08" />
      <circle cx="80" cy="80" r="57" fill="none" stroke={palette.bg} strokeWidth="5" />
      {brandLogoUrl
        ? <image href={brandLogoUrl} x="26" y="22" width="108" height="114" clipPath="url(#logoClipMin)" preserveAspectRatio="xMidYMid slice" />
        : <text x="83" y="85" textAnchor="middle" fontFamily="Georgia,serif" fontSize="9" letterSpacing="4" fill={palette.bg} opacity="0.6">{form.brandName}</text>
      }
      <text x={W / 2} y="142" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" letterSpacing="7" fill={palette.bg} opacity="0.4">{form.brandName}</text>
      <line x1="160" x2="640" y1="158" y2="158" stroke={palette.bg} strokeWidth="0.5" opacity="0.15" />
      {itemImageUrl
        ? <image href={itemImageUrl} x="80" y="178" width="640" height="420" preserveAspectRatio="xMidYMid slice" />
        : <rect x="80" y="178" width="640" height="420" fill={palette.accent} opacity="0.06" />
      }
      <text x={W / 2} y="658" textAnchor="middle" fontFamily="Georgia,serif" fontSize="60" fontWeight="900" fill={palette.bg}>{form.subheadline}</text>
      <text x={W / 2} y="696" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontStyle="italic" fill={palette.accent}>{form.tagline}</text>
      <line x1="160" x2="640" y1="718" y2="718" stroke={palette.bg} strokeWidth="0.5" opacity="0.12" />
      <text x={W / 2} y="750" textAnchor="middle" fontFamily="sans-serif" fontSize="18" fill="#666">{form.description}</text>
      <rect x="270" y="784" width="260" height="46" fill={palette.bg} />
      <text x={W / 2} y="814" textAnchor="middle" fontFamily="sans-serif" fontSize="13" fontWeight="700" letterSpacing="3" fill="#fff">{form.cta.toUpperCase()}</text>
      <text x="150" y="890" fontFamily="sans-serif" fontSize="16" fill="#aaa">📞 {form.phone}</text>
      <text x="500" y="890" fontFamily="sans-serif" fontSize="16" fill="#aaa">🌐 {form.website}</text>
      <text x={W / 2} y="922" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fill="#bbb">{form.social}</text>
    </svg>
  );
}

export default function AdCreativeBuilder() {
  const [menuItems, setMenuItems]           = useState([]);
  const [selectedItem, setSelectedItem]     = useState(null);
  const [template, setTemplate]             = useState("crave");
  const [paletteIdx, setPaletteIdx]         = useState(0);
  const [form, setForm]                     = useState(DEFAULT_FORM);
  const [itemImageUrl, setItemImageUrl]     = useState("");
  const [brandLogoUrl, setBrandLogoUrl]     = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [logoUploading, setLogoUploading]   = useState(false);
  const [activeTab, setActiveTab]           = useState("text");

  const imageRef = useRef(null);
  const logoRef  = useRef(null);
  const svgRef   = useRef(null);

  useEffect(() => {
    base44.entities.MenuItem.list("name", 200)
      .then(d => setMenuItems(d || []))
      .catch(() => {});
  }, []);

  const handleItemSelect = (id) => {
    const item = menuItems.find(m => m.id === id);
    if (!item) return;
    setSelectedItem(item);
    setForm(f => ({
      ...f,
      subheadline: item.name,
      description: item.description || `Delicious ${item.category || "dish"} made fresh for you.`,
    }));
    if (item.image_url) setItemImageUrl(item.image_url);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setImageUploading(true);
    const reader = new FileReader();
    reader.onload  = ev => { setItemImageUrl(ev.target.result); setImageUploading(false); };
    reader.onerror = ()  => { toast.error("Failed to read image"); setImageUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { toast.error("Logo must be under 1MB"); return; }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload  = ev => { setBrandLogoUrl(ev.target.result); setLogoUploading(false); toast.success("Brand logo uploaded!"); };
    reader.onerror = ()  => { toast.error("Failed to read logo"); setLogoUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) { toast.error("Nothing to download yet"); return; }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ad-creative-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded!");
  };

  const upd     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const palette = ACCENT_COLORS[paletteIdx];

  const FIELDS = [
    ["headline",     "Headline"],
    ["subheadline",  "Sub-headline (item name)"],
    ["tagline",      "Tagline"],
    ["description",  "Description"],
    ["bullet1",      "Bullet 1"],
    ["bullet2",      "Bullet 2"],
    ["bullet3",      "Bullet 3"],
    ["cta",          "Call to Action"],
    ["phone",        "Phone"],
    ["website",      "Website"],
    ["social",       "Social Handle"],
    ["brandName",    "Brand Name"],
    ["brandTagline", "Brand Tagline"],
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ad Creative Builder</h1>
          <p className="text-sm text-muted-foreground">Design promotional posters from your menu</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-1" /> Download SVG
        </Button>
      </div>

      <div className="flex gap-6 flex-col xl:flex-row">
        <div className="w-full xl:w-80 shrink-0 space-y-4">

          <div className="glass rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-primary" /> Menu Item
            </h3>
            <select
              value={selectedItem?.id || ""}
              onChange={e => handleItemSelect(e.target.value)}
              className="w-full h-10 rounded-xl bg-secondary border border-white/10 text-sm px-3 text-foreground"
            >
              <option value="">— Select a menu item —</option>
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}{item.category ? ` (${item.category})` : ""}</option>
              ))}
            </select>

            {/* Dish image */}
            <div className="space-y-1.5">
              <Label className="text-xs">Item / Dish Image</Label>
              {itemImageUrl ? (
                <div className="relative">
                  <img src={itemImageUrl} alt="item" className="w-full h-32 object-cover rounded-xl border border-white/10" />
                  <button onClick={() => setItemImageUrl("")} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => imageRef.current?.click()} className="w-full h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 flex items-center justify-center gap-2 text-muted-foreground text-xs transition-all">
                  {imageUploading ? "Loading..." : <><Upload className="w-3 h-3" /> Upload food photo</>}
                </button>
              )}
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Brand logo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Logo (top-left of poster)</Label>
              {brandLogoUrl ? (
                <div className="flex items-center gap-3 p-2 glass rounded-xl border border-white/10">
                  <img src={brandLogoUrl} alt="logo" className="h-10 w-10 object-contain rounded-lg bg-white/5" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">Logo uploaded</span>
                  <button onClick={() => setBrandLogoUrl("")} className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => logoRef.current?.click()} className="w-full h-16 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 flex items-center justify-center gap-2 text-muted-foreground text-xs transition-all">
                  {logoUploading ? "Loading..." : <><Upload className="w-3 h-3" /> Upload brand logo</>}
                </button>
              )}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <p className="text-[10px] text-muted-foreground">PNG/JPG · max 1MB · replaces text badge on poster</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" /> Template
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${template === t.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Color Palette
            </h3>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c, i) => (
                <button key={i} onClick={() => setPaletteIdx(i)} title={c.label}
                  style={{ background: c.bg, border: paletteIdx === i ? `3px solid ${c.accent}` : "3px solid transparent" }}
                  className="w-9 h-9 rounded-full transition-all flex items-center justify-center">
                  <span style={{ background: c.accent }} className="w-3 h-3 rounded-full block" />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{ACCENT_COLORS[paletteIdx].label}</p>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" /> Edit Text
            </h3>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              {[["text", "Content"], ["brand", "Brand"]].map(([k, l]) => (
                <button key={k} onClick={() => setActiveTab(k)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === k ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {FIELDS.filter(([k]) => {
                if (activeTab === "brand") return ["brandName", "brandTagline", "phone", "website", "social"].includes(k);
                return !["brandName", "brandTagline", "phone", "website", "social"].includes(k);
              }).map(([k, l]) => (
                <div key={k} className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">{l}</Label>
                  <Input value={form[k]} onChange={e => upd(k, e.target.value)} className="h-8 bg-white/5 border-white/10 text-xs" />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full bg-white/5 border-white/10 text-xs" onClick={() => setForm(DEFAULT_FORM)}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reset to defaults
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Live Preview — {TEMPLATES.find(t => t.id === template)?.label} · {ACCENT_COLORS[paletteIdx].label}</p>
              <p className="text-[10px] text-muted-foreground">800×1000px</p>
            </div>
            <div ref={svgRef} className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: "4/5", maxHeight: "70vh" }}>
              <PosterCanvas form={form} template={template} palette={palette} itemImageUrl={itemImageUrl} brandLogoUrl={brandLogoUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}