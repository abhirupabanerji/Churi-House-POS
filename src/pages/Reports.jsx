import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BRANCHES = ["All Branches","Main Branch","Jubilee Hills","Banjara Hills","Secunderabad"];
const tooltipStyle = { background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 };

const ALL_MONTHLY = [
  { month: "Jan", revenue: 420000, orders: 1200 }, { month: "Feb", revenue: 380000, orders: 1050 },
  { month: "Mar", revenue: 510000, orders: 1400 }, { month: "Apr", revenue: 470000, orders: 1300 },
  { month: "May", revenue: 560000, orders: 1550 }, { month: "Jun", revenue: 620000, orders: 1700 },
  { month: "Jul", revenue: 590000, orders: 1620 }, { month: "Aug", revenue: 640000, orders: 1780 },
  { month: "Sep", revenue: 680000, orders: 1850 }, { month: "Oct", revenue: 720000, orders: 1920 },
  { month: "Nov", revenue: 750000, orders: 2050 }, { month: "Dec", revenue: 810000, orders: 2200 },
];

const BRANCH_DATA = {
  "All Branches": [{ branch: "Main", revenue: 280000 },{ branch: "Jubilee", revenue: 210000 },{ branch: "Banjara", revenue: 190000 },{ branch: "Secbad", revenue: 150000 }],
  "Main Branch":    [{ branch: "Main", revenue: 280000 }],
  "Jubilee Hills":  [{ branch: "Jubilee", revenue: 210000 }],
  "Banjara Hills":  [{ branch: "Banjara", revenue: 190000 }],
  "Secunderabad":   [{ branch: "Secbad", revenue: 150000 }],
};

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
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("All Branches");
  const [exporting, setExporting] = useState(false);

  const monthlyData = selectedMonth === "All" ? ALL_MONTHLY : ALL_MONTHLY.filter(d => d.month === selectedMonth);
  const branchData = BRANCH_DATA[branch] || BRANCH_DATA["All Branches"];
  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = monthlyData.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const bestMonth = ALL_MONTHLY.reduce((best, d) => d.revenue > best.revenue ? d : best, ALL_MONTHLY[0]);

  const handleExport = async () => {
    setExporting(true);
    const orders = await base44.entities.Order.list("-created_date", 1000).catch(() => []);
    const filtered = orders.filter(o => {
      if (dateFrom && o.created_date && o.created_date < dateFrom) return false;
      if (dateTo && o.created_date && o.created_date > dateTo + "T23:59:59") return false;
      return true;
    });
    downloadCSV(filtered.length ? filtered : orders, `orders_report_${new Date().toISOString().split("T")[0]}.csv`);
    setExporting(false);
    toast.success("Report exported!");
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{"Reports & Analytics"}</h1>
          <p className="text-sm text-muted-foreground">Business performance insights</p>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="bg-primary hover:bg-primary/90 glow-orange">
          <Download className="w-4 h-4 mr-2" />{exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filters */}
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
          <select value={branch} onChange={e => setBranch(e.target.value)} className="h-9 rounded-md bg-secondary border border-white/10 text-sm px-3 text-foreground">
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => `\u20b9${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#rg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{"Branch-wise Revenue"}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <YAxis type="category" dataKey="branch" stroke="rgba(255,255,255,0.4)" fontSize={11} width={70} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => `\u20b9${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#ea580c" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Order Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.6)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Total Revenue", `\u20b9${(totalRevenue/100000).toFixed(1)}L`, "text-primary"],
              ["Total Orders", totalOrders.toLocaleString(), "text-foreground"],
              ["Avg Order Value", `\u20b9${avgOrderValue.toLocaleString()}`, "text-green-400"],
              ["Best Month", bestMonth.month, "text-yellow-400"],
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