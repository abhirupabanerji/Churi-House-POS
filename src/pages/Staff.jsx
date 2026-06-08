import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Pencil, Trash2, X, KeyRound } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { softDelete } from "@/lib/softDelete";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = ["admin","branch_manager","cashier","kitchen_staff","inventory_manager","accountant","delivery_rider","user"];
const BRANCHES = ["Main Branch","Jubilee Hills","Banjara Hills","Secunderabad"];
const roleColor = {
  admin: "bg-primary/10 text-primary",
  branch_manager: "bg-purple-500/10 text-purple-400",
  cashier: "bg-green-500/10 text-green-400",
  kitchen_staff: "bg-yellow-500/10 text-yellow-400",
  inventory_manager: "bg-blue-500/10 text-blue-400",
  accountant: "bg-cyan-500/10 text-cyan-400",
  delivery_rider: "bg-orange-500/10 text-orange-400",
  user: "bg-muted text-muted-foreground",
};

const emptyForm = { full_name: "", email: "", phone: "", role: "cashier", branch_id: "" };

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addErrors, setAddErrors] = useState({});
  const [editForm, setEditForm] = useState({ role: "cashier", branch_id: "" });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () =>
    base44.entities.User.list("full_name", 100)
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  const validateAdd = () => {
    const errs = {};
    if (!addForm.full_name.trim()) errs.full_name = "Full name is required.";
    if (!addForm.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!addForm.phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (!/^\+?[0-9\s\-()]{7,15}$/.test(addForm.phone.trim())) {
      errs.phone = "Enter a valid phone number.";
    }
    if (!addForm.role) errs.role = "Role is required.";
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEdit = () => {
  const errs = {};
  if (!editForm.full_name?.trim()) errs.full_name = "Full name is required.";
  if (!editForm.email?.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
    errs.email = "Enter a valid email address.";
  }
  if (!editForm.phone?.trim()) {
    errs.phone = "Phone number is required.";
  } else if (!/^\+?[0-9\s\-()]{7,15}$/.test(editForm.phone.trim())) {
    errs.phone = "Enter a valid phone number.";
  }
  if (!editForm.role) errs.role = "Role is required.";
  setEditErrors(errs);
  return Object.keys(errs).length === 0;
};


  // ── Actions ───────────────────────────────────────────────────────────────

  const addStaff = async () => {
    if (!validateAdd()) return;
    setSaving(true);
    try {
      await base44.entities.User.create(addForm);
      logAudit({ action: `Staff added: ${addForm.full_name}`, type: "staff", details: `Role: ${addForm.role}, Phone: ${addForm.phone}` });
      toast.success(`✅ ${addForm.full_name} added successfully.`);
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error("❌ Failed to add staff: " + (err?.message || "Unknown error"));
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await base44.entities.User.update(selected.id, editForm);
      logAudit({ action: `Staff updated: ${selected.full_name || selected.email}`, type: "staff", details: `Role: ${editForm.role}, Branch: ${editForm.branch_id}` });
      toast.success(`✅ ${selected.full_name || selected.email} updated successfully.`);
      setShowEdit(false);
      load();
    } catch (err) {
      toast.error("❌ Update failed.");
    } finally { setSaving(false); }
  };


  const remove = async (u) => {
    if (!confirm(`Remove ${u.full_name || u.email}?`)) return;
    await softDelete({ module: "Staff", id: u.id, name: u.full_name || u.email, data: u });
    await base44.entities.User.delete(u.id);
    logAudit({ action: `Staff removed: ${u.full_name || u.email}`, type: "staff", details: `Role: ${u.role}, Email: ${u.email}` });
    toast.success(`🗑️ ${u.full_name || u.email} moved to Recycle Bin.`);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground">{users.length} team members</p>
        </div>
        <Button onClick={() => { setAddForm(emptyForm); setAddErrors({}); setShowAdd(true); }}
          className="bg-primary hover:bg-primary/90 glow-orange">
          <UserPlus className="w-4 h-4 mr-1" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Name", "Email", "Phone", "Role", "Branch", "Actions"].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No staff yet.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{(u.full_name || u.email || "?")[0].toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-foreground">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{u.email || "—"}</td>
                  <td className="p-4 text-muted-foreground text-xs">{u.phone || "—"}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColor[u.role] || roleColor.user}`}>
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">{u.branch_id || "All"}</td>
                  <td className="p-4 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10"
                      onClick={() => { setSelected(u); setEditForm({ full_name: u.full_name || "", email: u.email || "",   phone: u.phone || "", role: u.role || "user", branch_id: u.branch_id || "" }); setEditErrors({}); setShowEdit(true); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400"
                      onClick={() => remove(u)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Staff</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={addForm.full_name}
                onChange={e => { setAddForm(f => ({ ...f, full_name: e.target.value })); setAddErrors(er => ({ ...er, full_name: "" })); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${addErrors.full_name ? "border-red-500" : ""}`}
                placeholder="John Doe"
              />
              {addErrors.full_name && <p className="text-xs text-red-400">{addErrors.full_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={e => { setAddForm(f => ({ ...f, email: e.target.value })); setAddErrors(er => ({ ...er, email: "" })); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${addErrors.email ? "border-red-500" : ""}`}
                placeholder="staff@example.com"
              />
              {addErrors.email && <p className="text-xs text-red-400">{addErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number *</Label>
              <Input
                type="tel"
                value={addForm.phone}
                onChange={e => { setAddForm(f => ({ ...f, phone: e.target.value })); setAddErrors(er => ({ ...er, phone: "" })); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${addErrors.phone ? "border-red-500" : ""}`}
                placeholder="+91 98765 43210"
              />
              {addErrors.phone && <p className="text-xs text-red-400">{addErrors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role *</Label>
              <select
                value={addForm.role}
                onChange={e => { setAddForm(f => ({ ...f, role: e.target.value })); setAddErrors(er => ({ ...er, role: "" })); }}
                className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${addErrors.role ? "border-red-500" : "border-white/10"}`}
              >
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
              {addErrors.role && <p className="text-xs text-red-400">{addErrors.role}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <select
                value={addForm.branch_id}
                onChange={e => setAddForm(f => ({ ...f, branch_id: e.target.value }))}
                className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground"
              >
                <option value="">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={addStaff} disabled={saving}>
                {saving ? "Adding..." : "Add Staff"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEdit && selected && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Edit Staff</h2>
        <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label className="text-xs">Full Name *</Label>
        <Input
          value={editForm.full_name}
          onChange={e => { setEditForm(f => ({ ...f, full_name: e.target.value })); setEditErrors(er => ({ ...er, full_name: "" })); }}
          className={`h-9 bg-white/5 border-white/10 text-sm ${editErrors.full_name ? "border-red-500" : ""}`}
        />
        {editErrors.full_name && <p className="text-xs text-red-400">{editErrors.full_name}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-xs">Email *</Label>
        <Input
          type="email"
          value={editForm.email}
          onChange={e => { setEditForm(f => ({ ...f, email: e.target.value })); setEditErrors(er => ({ ...er, email: "" })); }}
          className={`h-9 bg-white/5 border-white/10 text-sm ${editErrors.email ? "border-red-500" : ""}`}
        />
        {editErrors.email && <p className="text-xs text-red-400">{editErrors.email}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label className="text-xs">Phone Number *</Label>
        <Input
          type="tel"
          value={editForm.phone}
          onChange={e => { setEditForm(f => ({ ...f, phone: e.target.value })); setEditErrors(er => ({ ...er, phone: "" })); }}
          className={`h-9 bg-white/5 border-white/10 text-sm ${editErrors.phone ? "border-red-500" : ""}`}
        />
        {editErrors.phone && <p className="text-xs text-red-400">{editErrors.phone}</p>}
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label className="text-xs">Role *</Label>
        <select
          value={editForm.role}
          onChange={e => { setEditForm(f => ({ ...f, role: e.target.value })); setEditErrors(er => ({ ...er, role: "" })); }}
          className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${editErrors.role ? "border-red-500" : "border-white/10"}`}
        >
          {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>
        {editErrors.role && <p className="text-xs text-red-400">{editErrors.role}</p>}
      </div>

      {/* Branch */}
      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <select
          value={editForm.branch_id}
          onChange={e => setEditForm(f => ({ ...f, branch_id: e.target.value }))}
          className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground"
        >
          <option value="">All Branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowEdit(false)}>Cancel</Button>
        <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveEdit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
