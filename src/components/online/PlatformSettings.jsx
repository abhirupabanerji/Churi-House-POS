import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fieldError } from "@/lib/formValidation";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultDaySlot = () => ({ open: "10:00", close: "22:00" });
const defaultSchedule = () =>
  Object.fromEntries(DAYS.map(d => [d, { enabled: true, slots: [defaultDaySlot()] }]));

function isCurrentlyOpen(schedule, platformEnabled) {
  if (!platformEnabled) return false;
  const now = new Date();
  const dayName = DAYS[(now.getDay() + 6) % 7]; // Monday=0
  const dayData = schedule?.[dayName];
  if (!dayData?.enabled || !dayData.slots?.length) return false;
  const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  return dayData.slots.some(s => s.open <= hhmm && hhmm <= s.close);
}

export default function PlatformSettings() {
  const [activeTab, setActiveTab] = useState("swiggy");
  const [records, setRecords] = useState({ swiggy: null, zomato: null });
  const [configs, setConfigs] = useState({
    swiggy: { enabled: true, schedule: defaultSchedule() },
    zomato: { enabled: true, schedule: defaultSchedule() },
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.entities.PlatformSchedule.list("platform", 10).then(rows => {
      const newRecords = { swiggy: null, zomato: null };
      const newConfigs = {
        swiggy: { enabled: true, schedule: defaultSchedule() },
        zomato: { enabled: true, schedule: defaultSchedule() },
      };
      rows.forEach(r => {
        if (r.platform === "swiggy" || r.platform === "zomato") {
          newRecords[r.platform] = r;
          try {
            const parsed = JSON.parse(r.schedule || "{}");
            newConfigs[r.platform] = {
              enabled: r.enabled !== false,
              schedule: { ...defaultSchedule(), ...parsed },
            };
          } catch {}
        }
      });
      setRecords(newRecords);
      setConfigs(newConfigs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (platform, key, value) => {
    setConfigs(c => ({ ...c, [platform]: { ...c[platform], [key]: value } }));
  };

  const updateDay = (platform, day, key, value) => {
    setConfigs(c => ({
      ...c,
      [platform]: {
        ...c[platform],
        schedule: {
          ...c[platform].schedule,
          [day]: { ...c[platform].schedule[day], [key]: value },
        },
      },
    }));
  };

  const updateSlot = (platform, day, idx, field, value) => {
    setConfigs(c => {
      const slots = [...(c[platform].schedule[day].slots || [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return {
        ...c,
        [platform]: {
          ...c[platform],
          schedule: { ...c[platform].schedule, [day]: { ...c[platform].schedule[day], slots } },
        },
      };
    });
  };

  const addSlot = (platform, day) => {
    setConfigs(c => {
      const slots = [...(c[platform].schedule[day].slots || []), defaultDaySlot()];
      return {
        ...c,
        [platform]: {
          ...c[platform],
          schedule: { ...c[platform].schedule, [day]: { ...c[platform].schedule[day], slots } },
        },
      };
    });
  };

  const removeSlot = (platform, day, idx) => {
    setConfigs(c => {
      const slots = c[platform].schedule[day].slots.filter((_, i) => i !== idx);
      return {
        ...c,
        [platform]: {
          ...c[platform],
          schedule: { ...c[platform].schedule, [day]: { ...c[platform].schedule[day], slots } },
        },
      };
    });
  };

  const save = async (platform) => {
    setSaving(true);
    const cfg = configs[platform];
    const data = {
      platform,
      enabled: cfg.enabled,
      schedule: JSON.stringify(cfg.schedule),
    };
    let rec = records[platform];
    if (rec) {
      await base44.entities.PlatformSchedule.update(rec.id, data);
    } else {
      rec = await base44.entities.PlatformSchedule.create(data);
      setRecords(r => ({ ...r, [platform]: rec }));
    }
    setSaving(false);
    toast.success(`✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} schedule saved.`);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const platform = activeTab;
  const cfg = configs[platform];
  const isOpen = isCurrentlyOpen(cfg.schedule, cfg.enabled);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Platform Settings</h3>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isOpen ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {isOpen ? "Currently Open" : "Currently Closed"}
        </span>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {["swiggy", "zomato"].map(p => (
          <button
            key={p}
            onClick={() => { setErrors({}); setActiveTab(p); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${activeTab === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Platform Enable Toggle */}
      <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
        <div>
          <Label className="text-sm capitalize">{platform} Ordering</Label>
          <p className="text-xs text-muted-foreground">Enable or disable this platform entirely</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={v => update(platform, "enabled", v)} />
      </div>

      {/* Day-by-day schedule */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Operating Hours</Label>
        {DAYS.map(day => {
          const dayData = cfg.schedule[day] || { enabled: true, slots: [defaultDaySlot()] };
          return (
            <div key={day} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dayData.enabled}
                    onCheckedChange={v => updateDay(platform, day, "enabled", v)}
                  />
                  <span className="text-sm font-medium text-foreground">{day}</span>
                </div>
                {dayData.enabled && (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] bg-white/5 border-white/10" onClick={() => addSlot(platform, day)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Slot
                  </Button>
                )}
              </div>
              {dayData.enabled && (dayData.slots || [defaultDaySlot()]).map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2 ml-8">
                  <input
                    type="time"
                    value={slot.open}
                    onChange={e => updateSlot(platform, day, idx, "open", e.target.value)}
                    className="h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2 text-foreground"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="time"
                    value={slot.close}
                    onChange={e => updateSlot(platform, day, idx, "close", e.target.value)}
                    className="h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2 text-foreground"
                  />
                  {(fieldError(errors, `${day}-${idx}-open`) || fieldError(errors, `${day}-${idx}-close`)) && <p className="text-xs text-red-400">This field is required</p>}
                  {(dayData.slots || []).length > 1 && (
                    <button onClick={() => removeSlot(platform, day, idx)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {!dayData.enabled && (
                <p className="ml-8 text-xs text-muted-foreground">Closed</p>
              )}
            </div>
          );
        })}
      </div>

      <Button className="bg-primary hover:bg-primary/90 glow-orange" onClick={() => save(platform)} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : `Save ${platform.charAt(0).toUpperCase() + platform.slice(1)} Schedule`}
      </Button>
    </div>
  );
}