import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, ChefHat, CheckCircle, XCircle, LayoutGrid, List } from "lucide-react";
import { logAudit } from "@/lib/auditLog";
import { useEntityQuery, useInvalidate } from "@/lib/useEntityQuery";
import { toast } from "sonner";

const statusConfig = {
  pending:   { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock, label: "Pending" },
  preparing: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: ChefHat, label: "Preparing" },
  ready:     { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Ready" },
  served:    { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: CheckCircle, label: "Served" },
  completed: { color: "bg-muted text-muted-foreground border-border", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, label: "Cancelled" },
};

const typeLabels = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery", swiggy: "Swiggy", zomato: "Zomato" };

export default function Orders() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: orders = [], isLoading: loading } = useEntityQuery("Order", { sort: "-created_date", limit: 200 });
  const invalidate = useInvalidate();

  const updateStatus = async (id, status) => {
    const order = orders.find(o => o.id === id);
    await base44.entities.Order.update(id, { status });
    invalidate("Order");
    logAudit({ action: `Order status updated: ${order?.order_number}`, type: "order", details: `${order?.status} → ${status}` });
    toast.success(`✅ Order ${order?.order_number} marked as ${status}.`);
  };

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.type !== filter) return false;
    if (search && !o.order_number?.toLowerCase().includes(search.toLowerCase()) && !o.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && o.created_date) {
      if (new Date(o.created_date) < new Date(dateFrom)) return false;
    }
    if (dateTo && o.created_date) {
      if (new Date(o.created_date) > new Date(dateTo + "T23:59:59")) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg border transition-all ${viewMode === "grid" ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg border transition-all ${viewMode === "list" ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-white/5 border-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 bg-white/5 border-white/10 text-xs w-40" placeholder="From" />
            <span className="text-muted-foreground text-xs">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 bg-white/5 border-white/10 text-xs w-40" placeholder="To" />
            {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-primary hover:underline">Clear</button>}
          </div>
        </div>
        <div className="flex gap-1 glass rounded-xl p-1 flex-wrap">
          {[["all","All"],["dine_in","Walk-in"],["takeaway","Takeaway"],["swiggy","Swiggy"],["zomato","Zomato"],["delivery","Delivery"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><p>No orders found</p></div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const Icon = sc.icon;
            return (
              <div key={order.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono font-bold text-foreground">{order.order_number}</span>
                  <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border ${sc.color}`}><Icon className="w-3 h-3" />{sc.label}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">{typeLabels[order.type] || order.type}</span>
                  {order.table_number && <span className="text-xs text-muted-foreground">Table {order.table_number}</span>}
                  {order.customer_name && <span className="text-xs text-muted-foreground truncate">{order.customer_name}</span>}
                </div>
                {order.items?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {order.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                        <span className="text-foreground">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && <p className="text-[10px] text-muted-foreground">+{order.items.length - 3} more items</p>}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-lg font-bold text-primary">₹{order.total}</span>
                  <div className="flex gap-1.5">
                    {order.status === "pending" && <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(order.id, "preparing")}>Start</Button>}
                    {order.status === "preparing" && <Button size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700" onClick={() => updateStatus(order.id, "ready")}>Ready</Button>}
                    {order.status === "ready" && <Button size="sm" className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700" onClick={() => updateStatus(order.id, "served")}>Serve</Button>}
                    {order.status === "served" && <Button size="sm" className="h-7 text-[10px]" onClick={() => updateStatus(order.id, "completed")}>Complete</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">{["Order #","Type","Customer","Table","Total","Status","Actions"].map(h => <th key={h} className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.pending;
                const Icon = sc.icon;
                return (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-foreground text-xs">{order.order_number}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">{typeLabels[order.type] || order.type}</span></td>
                    <td className="p-3 text-muted-foreground text-xs">{order.customer_name || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{order.table_number || "—"}</td>
                    <td className="p-3 font-bold text-primary">₹{order.total}</td>
                    <td className="p-3"><span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${sc.color}`}><Icon className="w-2.5 h-2.5" />{sc.label}</span></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {order.status === "pending" && <Button size="sm" className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 px-2" onClick={() => updateStatus(order.id, "preparing")}>Start</Button>}
                        {order.status === "preparing" && <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 px-2" onClick={() => updateStatus(order.id, "ready")}>Ready</Button>}
                        {order.status === "ready" && <Button size="sm" className="h-6 text-[10px] bg-purple-600 hover:bg-purple-700 px-2" onClick={() => updateStatus(order.id, "served")}>Serve</Button>}
                        {order.status === "served" && <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateStatus(order.id, "completed")}>Done</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}