import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Pencil, Trash2, X, KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";
import { fieldError } from "@/lib/formValidation";

const ROLES = ["super_admin", "admin", "manager", "cashier", "staff"];
const BRANCHES = ["All Branches", "Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];
const FRANCHISES = ["Churi House", "Jubilee Hills", "Banjara Hills", "Secunderabad"];

const roleColor = {
  super_admin: "bg-red-500/10 text-red-400",
  admin: "bg-primary/10 text-primary",
  manager: "bg-purple-500/10 text-purple-400",
  cashier: "bg-green-500/10 text-green-400",
  staff: "bg-muted text-muted-foreground",
};

const emptyForm = {
  full_name: "", username: "", email: "", password: "",
  role: "cashier", branch_id: "All Branches", franchise: "Churi House", status: "active",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Password reset
  const [showPwd, setShowPwd] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Per-user app PIN
  const [showPin, setShowPin] = useState(false);
  const [pinUser, setPinUser] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const load = () =>
    base44.entities.AppUser.list("full_name", 100)
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(emptyForm);
    setError(""); setFormErrors({}); setShowForm(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      full_name: u.full_name || "", username: u.username || "",
      email: u.email || "", password: "",
      role: u.role || "staff", branch_id: u.branch_id || "All Branches",
      franchise: u.franchise || "Churi House", status: u.status || "active",
    });
    setError(""); setFormErrors({}); setShowForm(true);
  };

  const save = async () => {
    if (!form.username.trim()) return setError("Username is required.");
    if (!editing && !form.password.trim()) return setError("Password is required for new users.");
    setError(""); setSaving(true);
    try {
      if (!editing) {
        const existing = users.find(u => u.username?.toLowerCase() === form.username.toLowerCase());
        if (existing) { setError("Username already exists."); setSaving(false); return; }
      }
      const data = { ...form };
      if (editing && !data.password) delete data.password;
      if (editing) {
        await base44.entities.AppUser.update(editing.id, data);
        logAudit({ action: `User updated: ${form.full_name || form.username}`, type: "admin", details: `Role: ${form.role}` });
      } else {
        await base44.entities.AppUser.create(data);
        logAudit({ action: `User created: ${form.full_name || form.username}`, type: "admin", details: `Role: ${form.role}` });
      }
      setShowForm(false);
      toast.success(`✅ ${form.full_name || form.username} ${editing ? "updated" : "added"} successfully.`);
      load();
    } catch (err) {
      setError(err?.message || "Failed to save user.");
      toast.error("❌ Something went wrong.");
    } finally { setSaving(false); }
  };

  const remove = async (u) => {
    if (!confirm(`Remove user "${u.username}"?`)) return;
    await base44.entities.AppUser.delete(u.id);
    logAudit({ action: `User deleted: ${u.username}`, type: "admin" });
    toast.success(`🗑️ ${u.username} permanently deleted.`);
    load();
  };

  const resetPassword = async () => {
    if (!newPwd.trim()) return;
    await base44.entities.AppUser.update(selectedUser.id, { password: newPwd });
    logAudit({ action: `Password reset for: ${selectedUser.username}`, type: "admin" });
    toast.success(`✅ Password updated for ${selectedUser.username}.`);
    setShowPwd(false);
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === "active" ? "inactive" : "active";
    await base44.entities.AppUser.update(u.id, { status: newStatus });
    logAudit({ action: `User ${newStatus}: ${u.username}`, type: "admin" });
    toast.success(`✅ ${u.username} marked ${newStatus}.`);
    load();
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(newPin)) { setPinError("PIN must be exactly 4 digits."); return; }
    localStorage.setItem(`app_pin_${pinUser.username}`, newPin);
    logAudit({ action: `App PIN set for: ${pinUser.username}`, type: "admin" });
    toast.success(`✅ App PIN set for ${pinUser.full_name || pinUser.username}.`);
    setShowPin(false); setNewPin(""); setPinError("");
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} users</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 glow-orange">
          <UserPlus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Name", "Username", "Role", "Branch", "Franchise", "Status", "Last Login", "Actions"].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No users yet.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {(u.full_name || u.username || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{u.username}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColor[u.role] || roleColor.staff}`}>
                      {u.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{u.branch_id || "All"}</td>
                  <td className="p-4 text-xs text-muted-foreground">{u.franchise || "—"}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleStatus(u)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                        u.status === "active"
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-white/5 border-white/10" onClick={() => openEdit(u)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-blue-500/10 border-blue-500/20 text-blue-400" title="Reset Password"
                        onClick={() => { setSelectedUser(u); setNewPwd(""); setPwdError(""); setShowPwd(true); }}>
                        <KeyRound className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-yellow-500/10 border-yellow-500/20 text-yellow-400" title="Set App PIN"
                        onClick={() => { setPinUser(u); setNewPin(""); setPinError(""); setShowPin(true); }}>
                        <Lock className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400" onClick={() => remove(u)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editing ? "Edit User" : "Add New User"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Full Name *</Label>
                <Input value={form.full_name} onChange={e => { setForm(f => ({ ...f, full_name: e.target.value })); setFormErrors(er => ({ ...er, full_name: "" })); }}
                  className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(formErrors, "full_name") ? "border-red-500" : ""}`} />
                {fieldError(formErrors, "full_name") && <p className="text-xs text-red-400">{fieldError(formErrors, "full_name")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Username *</Label>
                <Input value={form.username} onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setFormErrors(er => ({ ...er, username: "" })); }}
                  className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(formErrors, "username") ? "border-red-500" : ""}`} />
                {fieldError(formErrors, "username") && <p className="text-xs text-red-400">{fieldError(formErrors, "username")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="h-9 bg-white/5 border-white/10 text-sm" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">{editing ? "New Password (leave blank to keep)" : "Password *"}</Label>
                <Input type="password" value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFormErrors(er => ({ ...er, password: "" })); }}
                  className={`h-9 bg-white/5 border-white/10 text-sm ${fieldError(formErrors, "password") ? "border-red-500" : ""}`} />
                {fieldError(formErrors, "password") && <p className="text-xs text-red-400">{fieldError(formErrors, "password")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Franchise</Label>
                <select value={form.franchise} onChange={e => setForm(f => ({ ...f, franchise: e.target.value }))}
                  className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {FRANCHISES.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch</Label>
                <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                  className="w-full h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={save} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPwd && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Reset Password</h2>
              <button onClick={() => setShowPwd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">For: <span className="text-foreground font-medium">{selectedUser.username}</span></p>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password *</Label>
              <Input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setPwdError(""); }}
                className={`h-9 bg-white/5 border-white/10 text-sm ${pwdError ? "border-red-500" : ""}`} />
              {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowPwd(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={resetPassword}>Update</Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Per-User App PIN Modal */}
      {showPin && pinUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Set App PIN</h2>
              <button onClick={() => setShowPin(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set 4-digit app PIN for{" "}
              <span className="text-foreground font-medium">{pinUser.full_name || pinUser.username}</span>.
              Used to unlock the entire app.
            </p>
            {localStorage.getItem(`app_pin_${pinUser.username}`) && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                PIN already set. Entering a new PIN will replace it.
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">4-Digit PIN *</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="h-9 bg-white/5 border-white/10 text-sm tracking-widest text-center text-lg"
              />
              {pinError && <p className="text-xs text-red-400">{pinError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setShowPin(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={savePin} disabled={newPin.length !== 4}>
                Set PIN
              </Button>
            </div>
            {localStorage.getItem(`app_pin_${pinUser.username}`) && (
              <Button
                variant="outline"
                className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                onClick={() => {
                  localStorage.removeItem(`app_pin_${pinUser.username}`);
                  logAudit({ action: `App PIN removed for: ${pinUser.username}`, type: "admin" });
                  toast.success(`✅ App PIN removed for ${pinUser.full_name || pinUser.username}.`);
                  setShowPin(false);
                }}
              >
                Remove PIN
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}