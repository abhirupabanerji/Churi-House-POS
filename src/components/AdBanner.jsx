import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Megaphone } from "lucide-react";

export default function AdBanner() {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    base44.entities.Advertisement.list("-created_date", 50)
      .then(ads => {
        const active = ads.find(a => a.is_active && a.placement === "pos_screen");
        if (active) { setAd(active); setDismissed(false); }
      })
      .catch(() => {});
  }, []);

  if (!ad || dismissed) return null;

  return (
    <div className="shrink-0">
      {/* Full-width image banner */}
      {ad.image_url && (
        <div className="w-full overflow-hidden" style={{ height: 100 }}>
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        </div>
      )}
      {/* Text bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20">
        <Megaphone className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs font-medium text-primary flex-1 truncate">
          {ad.title}{ad.description ? ` — ${ad.description}` : ""}
        </p>
        <button onClick={() => setDismissed(true)} className="text-primary/50 hover:text-primary transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}