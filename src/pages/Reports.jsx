import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getCurrentUserBranch } from "@/lib/branchFilter";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--foreground))",
  fontSize: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
};
const GRID_COLOR = "hsl(var(--border))";
const AXIS_COLOR = "hsl(var(--muted-foreground))";
const TICK_STYLE = { fill: "hsl(var(--muted-foreground))" };

function downloadCSV(data, filename) {
  if (!data.length) { toast.error("No data to export"); return; }
  const keys = Object.keys(data[0]).filter(k => k !== "created_by");
  const csv = [keys.join(","), ...data.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const { branch: userBranch, isAllBranches } = getCurrentUserBranch();
  const [branch, setBranch] = useState(isAllBranches ? "All Branches" : userBranch);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list("-created_date", 2000),
      base44.entities.Branch.list("name", 100),
    ]).then(([orderData, branchData]) => {
      setOrders(orderData || []);
      const names = (branchData || []).map(b => b.name).filter(Boolean);
      setBranches(names);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const branchOptions = ["All Branches", ...branches];

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.created_date) return false;
      const oBranch = o.branch_name || o.branch || "Main Branch";
      if (branch !== "All Branches" && oBranch.toLowerCase() !== branch.toLowerCase()) return false;
      if (selectedMonth !== "All") {
        const m = MONTHS[new Date(o.created_date).getMonth()];
        if (m !== selectedMonth) return false;
      }
      return true;
    });
  }, [orders, branch, selectedMonth]);

  const monthlyData = useMemo(() => {
    const monthsToShow = selectedMonth === "All" ? MONTHS : [selectedMonth];
    return monthsToShow.map(m => {
      const mOrders = orders.filter(o => {
        if (!o.created_date) return false;
        const oBranch = o.branch_name || o.branch || "Main Branch";
        const oMonth = MONTHS[new Date(o.created_date).getMonth()];
        if (branch !== "All Branches" && oBranch.toLowerCase() !== branch.toLowerCase()) return false;
        return oMonth === m;
      });
      return {
        month: m,
        revenue: mOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        orders: mOrders.length,
      };
    });
  }, [orders, branch, selectedMonth]);

  const branchData = useMemo(() => {
    const bMap = {};
    orders.forEach(o => {
      const b = o.branch_name || "Main Branch";
      if (branch !== "All Branches" && b.toLowerCase() !== branch.toLowerCase()) return;
      if (!bMap[b]) bMap[b] = { branch: b, revenue: 0 };
      bMap[b].revenue += (Number(o.total) || 0);
    });
    return Object.values(bMap).sort((a, b) => b.revenue - a.revenue);
  }, [orders, branch]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const bestMonth = monthlyData.length
    ? monthlyData.reduce((best, d) => d.revenue > best.revenue ? d : best, monthlyData[0]).month
    : "—";

  const handleExport = async () => {
    setExporting(true);
    const allOrders = await base44.entities.Order.list("-created_date", 2000).catch(() => []);
    const filtered = allOrders.filter(o => {
      if (dateFrom && o.created_date && o.created_date < dateFrom) return false;
      if (dateTo && o.created_date && o.created_date > dateTo + "T23:59:59") return false;
      if (branch !== "All Branches" && (o.branch_name || o.branch || "Main Branch").toLowerCase() !== branch.toLowerCase()) return false;
      return true;
    });
    downloadCSV(filtered.length ? filtered : allOrders, `orders_report_${new Date().toISOString().split("T")[0]}.csv`);
    setExporting(false);
    toast.success("Report exported!");
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {isAllBranches ? "All branches" : branch}
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="bg-primary hover:bg-primary/90 glow-orange">
          <Download className="w-4 h-4 mr-2" />{exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Month</p>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
            <option value="All">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Branch</p>
          {isAllBranches ? (
            <select value={branch} onChange={e => setBranch(e.target.value)} className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
              {loading ? <option>Loading...</option> : branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          ) : (
            <div className="h-9 flex items-center px-3 rounded-md bg-secondary/50 border border-white/10 text-sm text-primary font-medium min-w-[120px]">
              {userBranch}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Date Range (for export)</p>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 bg-white/5 border-white/10 text-xs w-36" />
            <span className="text-muted-foreground text-xs">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 bg-white/5 border-white/10 text-xs w-36" />
            {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-primary hover:underline">Clear</button>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ea580c" stopOpacity={0.3} /><stop offset="100%" stopColor="#ea580c" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
              <YAxis stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#rg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Branch-wise Revenue</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis type="number" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="branch" stroke={AXIS_COLOR} fontSize={11} width={80} tick={TICK_STYLE} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#ea580c" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Order Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
              <YAxis stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Total Revenue", `₹${(totalRevenue/100000).toFixed(1)}L`, "text-primary"],
              ["Total Orders", totalOrders.toLocaleString(), "text-foreground"],
              ["Avg Order Value", `₹${avgOrderValue.toLocaleString()}`, "text-green-400"],
              ["Best Month", bestMonth, "text-yellow-400"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-white/5 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{l}</p>
                <p className={`text-2xl font-bold ${c}`}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}