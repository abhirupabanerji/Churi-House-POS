import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Megaphone, Plus, Pencil, Trash2, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fieldError, required } from "@/lib/formValidation";

const PLACEMENTS = ["pos_screen"];

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", placement: "dashboard_banner", is_active: true, priority: 1 });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const uploadImage = async (file) => {
  setUploading(true);

  const reader = new FileReader();

  reader.onload = () => {
    setForm((f) => ({ ...f, image_url: reader.result }));
    setUploading(false);
  };

  reader.onerror = () => {
    setUploading(false);
    alert("Image upload failed.");
  };

  reader.readAsDataURL(file);
};

  const load = () => base44.entities.Advertisement.list("-created_date", 50).then(d => { setAds(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setErrors({}); setForm({ title: "", description: "", image_url: "", placement: "pos_screen", is_active: true, priority: 1 }); setShowForm(true); };
  const openEdit = (ad) => { setEditing(ad); setErrors({}); setForm({ title: ad.title, description: ad.description || "", image_url: ad.image_url || "", placement: ad.placement, is_active: ad.is_active ?? true, priority: ad.priority || 1 }); setShowForm(true); };

  const validate = () => {
    const next = {};
    required(next, "title", form.title);
    required(next, "placement", form.placement);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (editing) await base44.entities.Advertisement.update(editing.id, form);
    else await base44.entities.Advertisement.create(form);
    setShowForm(false);
    load();
  };

  const remove = async (id) => { await base44.entities.Advertisement.delete(id); load(); };
  const toggle = async (ad) => { await base44.entities.Advertisement.update(ad.id, { is_active: !ad.is_active }); load(); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Advertisements</h1><p className="text-sm text-muted-foreground">Manage promotional banners across screens</p></div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange"><Plus className="w-4 h-4 mr-1" /> New Ad</Button>
      </div>

      {/* POS Screen Ad Summary */}
      <div className="glass rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">POS Screen Ads</p>
          <p className="text-xs text-muted-foreground">{ads.filter(a => a.is_active).length} active · Displayed at the top of the POS billing screen</p>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ads.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-muted-foreground">No advertisements yet. Create your first ad.</div>
          ) : ads.map(ad => (
            <div key={ad.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
              {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-xl mb-3" />}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{ad.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{ad.description}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary mt-1 inline-block capitalize">{ad.placement?.replace("_"," ")}</span>
                </div>
                <Switch checked={ad.is_active} onCheckedChange={() => toggle(ad)} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-white/5 border-white/10" onClick={() => openEdit(ad)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => remove(ad.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Ad" : "New Advertisement"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {[["title","Title"],["description","Description"]].map(([k,l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input value={form[k]} onChange={e => { setForm(f => ({...f, [k]: e.target.value})); setErrors(er => ({...er, [k]: ""})); }} className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(errors, k) ? "border-red-500" : ""}`} />
                {fieldError(errors, k) && <p className="text-xs text-red-400">{fieldError(errors, k)}</p>}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">Ad Image</Label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Ad" className="w-full h-36 object-cover rounded-xl" />
                  <button onClick={() => setForm(f => ({...f, image_url: ""}))} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-colors"><X className="w-3.5 h-3.5 text-white" /></button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 h-28 glass rounded-xl border border-dashed border-white/20 hover:border-primary/40 cursor-pointer transition-all group">
                  {uploading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                  <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload image"}</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) uploadImage(f); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Placement</Label>
              <div className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-muted-foreground flex items-center">POS Screen (only)</div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({...f, is_active: v}))} />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}