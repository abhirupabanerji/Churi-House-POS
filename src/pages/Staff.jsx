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

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "cashier", phone: "" });
  const [inviteErrors, setInviteErrors] = useState({});
  const [editForm, setEditForm] = useState({ role: "cashier", branch_id: "" });
  const [editErrors, setEditErrors] = useState({});
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    base44.entities.User.list("full_name", 100)
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  const validateInvite = () => {
    const errs = {};
    if (!inviteForm.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!inviteForm.role) errs.role = "Role is required.";
    if (!inviteForm.phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (!/^\+?[0-9\s\-()]{7,15}$/.test(inviteForm.phone.trim())) {
      errs.phone = "Enter a valid phone number.";
    }
    setInviteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.role) errs.role = "Role is required.";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePwd = () => {
    if (!newPwd.trim()) { setPwdError("Password is required."); return false; }
    if (newPwd.length < 4) { setPwdError("Password must be at least 4 characters."); return false; }
    return true;
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const inviteUser = async () => {
    if (!validateInvite()) return;
    setSaving(true);
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role === "admin" ? "admin" : "user");
      await base44.entities.User.update(inviteForm.email, { phone: inviteForm.phone });
      logAudit({ action: `Staff invited: ${inviteForm.email}`, type: "staff", details: `Role: ${inviteForm.role}, Phone: ${inviteForm.phone}` });
      toast.success(`✅ Invite sent to ${inviteForm.email}.`);
      setShowInvite(false);
      load();
    } catch (err) {
      toast.error("❌ Failed to invite: " + (err?.message || "Unknown error"));
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

  const savePwd = async () => {
    if (!validatePwd()) return;
    setSaving(true);
    try {
      await base44.entities.User.update(selected.id, { password: newPwd });
      toast.success(`✅ Password updated for ${selected.full_name || selected.email}.`);
      setShowPwd(false);
    } catch (err) {
      toast.error("❌ Failed to update password.");
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
        <Button onClick={() => { setInviteForm({ email: "", role: "cashier", phone: "" }); setInviteErrors({}); setShowInvite(true); }}
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
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4 text-muted-foreground text-xs">{u.phone || "—"}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColor[u.role] || roleColor.user}`}>
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">{u.branch_id || "All"}</td>
                  <td className="p-4 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10"
                      onClick={() => { setSelected(u); setEditForm({ role: u.role || "user", branch_id: u.branch_id || "" }); setEditErrors({}); setShowEdit(true); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-blue-500/10 border-blue-500/20 text-blue-400"
                      onClick={() => { setSelected(u); setNewPwd(""); setPwdError(""); setShowPwd(true); }}>
                      <KeyRound className="w-3 h-3" />
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

      {/* Invite Staff Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Invite Staff</h2>
              <button onClick={() => setShowInvite(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={e => { setInviteForm(f => ({ ...f, email: e.target.value })); setInviteErrors(er => ({ ...er, email: "" })); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${inviteErrors.email ? "border-red-500" : ""}`}
                placeholder="staff@example.com"
              />
              {inviteErrors.email && <p className="text-xs text-red-400">{inviteErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number *</Label>
              <Input
                type="tel"
                value={inviteForm.phone}
                onChange={e => { setInviteForm(f => ({ ...f, phone: e.target.value })); setInviteErrors(er => ({ ...er, phone: "" })); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${inviteErrors.phone ? "border-red-500" : ""}`}
                placeholder="+91 98765 43210"
              />
              {inviteErrors.phone && <p className="text-xs text-red-400">{inviteErrors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role *</Label>
              <select
                value={inviteForm.role}
                onChange={e => { setInviteForm(f => ({ ...f, role: e.target.value })); setInviteErrors(er => ({ ...er, role: "" })); }}
                className={`w-full h-9 rounded-md bg-secondary border text-sm px-3 text-foreground ${inviteErrors.role ? "border-red-500" : "border-white/10"}`}
              >
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
              {inviteErrors.role && <p className="text-xs text-red-400">{inviteErrors.role}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={inviteUser} disabled={saving}>
                {saving ? "Sending..." : "Send Invite"}
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
              <h2 className="text-lg font-bold text-foreground">Edit {selected.full_name || selected.email}</h2>
              <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
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

      {/* Change Password Modal */}
      {showPwd && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Change Password</h2>
              <button onClick={() => setShowPwd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">For: <span className="text-foreground font-medium">{selected.full_name || selected.email}</span></p>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password *</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setPwdError(""); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${pwdError ? "border-red-500" : ""}`}
                placeholder="Min. 4 characters"
              />
              {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowPwd(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={savePwd} disabled={saving}>
                {saving ? "Saving..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
