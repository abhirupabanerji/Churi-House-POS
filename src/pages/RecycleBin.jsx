import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, RotateCcw, AlertTriangle, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/restaurantAuth";
import { logAudit } from "@/lib/auditLog";
import { toast } from "sonner";

const MODULE_LABELS = {
  MenuItem:       "Menu Item",
  InventoryItem:  "Inventory",
  Staff:          "Staff",
  User:           "User",
  Customer:       "Customer",
  Order:          "Order",
  "Online Orders" :"Online Order",
  Vendor:         "Vendor",
  PurchaseOrder:  "Purchase Order",
  Table:          "Table",
  Expense: "Expense",
  Branch:  "Branch",
};

export default function RecycleBin() {
  const session = getSession();
  const isAdmin = session?.role === "admin" || session?.role === "super_admin" || session?.role === "manager";

  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [moduleFilter, setModuleFilter]   = useState("All");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [deletedByFilter, setDeletedByFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.DeletedOrder.list("-deleted_at", 200)
      .then(d => { setRecords(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (!isAdmin) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-sm">Only Admins and Managers can access the Recycle Bin.</p>
      </div>
    );
  }

  const modules = ["All", ...new Set(records.map(r => r.source_module || "Order").filter(Boolean))];

  const filtered = records.filter(r => {
    const mod = r.source_module || "Order";
    if (moduleFilter !== "All" && mod !== moduleFilter) return false;
    if (deletedByFilter && !(r.deleted_by || "").toLowerCase().includes(deletedByFilter.toLowerCase())) return false;
    if (dateFrom && (r.deleted_at || "") < dateFrom) return false;
    if (dateTo && (r.deleted_at || "") > dateTo + "T23:59:59") return false;
    if (r.restored) return false;
    return true;
  });

  // Parse customer name from order_data if present
  const getCustomerName = (record) => {
    try {
      const data = JSON.parse(record.order_data || "{}");
      return data.customer_name || data.name || null;
    } catch {
      return null;
    }
  };

  const restore = async (record) => {
    try {
      const module = record.source_module || "Order";

      let originalData = {};
      try {
        originalData = JSON.parse(record.order_data || "{}");
      } catch {
        toast.error("Could not parse record data.");
        return;
      }

      const { id, created_date, updated_date, ...cleanData } = originalData;

      switch (module) {
        case "MenuItem":
          await base44.entities.MenuItem.create(cleanData);
          break;
        case "InventoryItem":
          await base44.entities.InventoryItem.create(cleanData);
          break;
        case "Staff":
          await base44.entities.Staff.create(cleanData);
          break;
        case "User":
          await base44.entities.User.create(cleanData);
          break;
        case "Customer":
          await base44.entities.Customer.create(cleanData);
          break;
        case "Order":
          await base44.entities.Order.create(cleanData);
          break;
        case "Expense":
          await base44.entities.Expense.create(cleanData);
          break;
        case "Branch":
          await base44.entities.Branch.create(cleanData);
          break;
        case "Online Orders":
          await base44.entities.Order.create(cleanData);  // same entity, type field distinguishes it
          break;
        case "Vendor":
          await base44.entities.Vendor.create(cleanData);
          break;
        case "PurchaseOrder":
          await base44.entities.PurchaseOrder.create(cleanData);
          break;
        case "Table":
          await base44.entities.Table.create(cleanData);
          break;
        default:
          toast.error(`Cannot restore: unknown module "${module}"`);
          return;
      }

      await base44.entities.DeletedOrder.update(record.id, { restored: true });
      logAudit({ action: `Restored: ${record.order_number}`, type: "admin", details: `Module: ${module}` });
      toast.success(`✅ "${record.order_number}" restored to ${MODULE_LABELS[module] || module}.`);
      load();
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error(`Restore failed: ${err?.message || "Unknown error"}`);
    }
  };

  const permanentDelete = async (record) => {
    try {
      await base44.entities.DeletedOrder.delete(record.id);
      logAudit({ action: `Permanently deleted: ${record.order_number}`, type: "admin", details: `Module: ${record.source_module || "Order"}` });
      toast.success(`🗑️ "${record.order_number}" permanently deleted.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      console.error("Permanent delete failed:", err);
      toast.error(`Delete failed: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recycle Bin</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} deleted records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-muted-foreground self-center" />
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Module</label>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
            className="h-9 rounded-lg bg-secondary border border-white/10 text-sm px-3 text-foreground">
            {modules.map(m => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">From Date</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 bg-white/5 border-white/10 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">To Date</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 bg-white/5 border-white/10 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Deleted By</label>
          <Input placeholder="Search name..." value={deletedByFilter} onChange={e => setDeletedByFilter(e.target.value)}
            className="h-9 bg-white/5 border-white/10 text-sm w-36" />
        </div>
        {(moduleFilter !== "All" || dateFrom || dateTo || deletedByFilter) && (
          <Button size="sm" variant="outline" className="bg-white/5 border-white/10 self-end"
            onClick={() => { setModuleFilter("All"); setDateFrom(""); setDateTo(""); setDeletedByFilter(""); }}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Trash2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">Recycle Bin is empty</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Record Name", "Module", "Deleted By", "Date & Time", "Actions"].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const moduleName = r.source_module || "Order";
                const customerName = getCustomerName(r);
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs text-foreground font-medium">{r.order_number}</span>
                      {/* Customer name shown for order-type records */}
                      {customerName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{customerName}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {MODULE_LABELS[moduleName] || moduleName}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-foreground">{r.deleted_by || "—"}</div>
                      {r.deleted_by_role && (
                        <div className="text-[10px] text-muted-foreground capitalize">{r.deleted_by_role}</div>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {r.deleted_at ? new Date(r.deleted_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline"
                          className="h-7 px-2 bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs"
                          onClick={() => restore(r)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          onClick={() => setConfirmDelete(r)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Permanent Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              <h2 className="text-lg font-bold text-foreground">Permanently Delete?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This will <span className="text-red-400 font-medium">permanently</span> delete{" "}
              <span className="text-foreground font-medium">"{confirmDelete.order_number}"</span>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => permanentDelete(confirmDelete)}>Delete Forever</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
