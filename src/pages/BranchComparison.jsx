import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend } from "recharts";
import { Loader2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#ea580c", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
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

export default function BranchComparison() {
  const [orders, setOrders] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(["All"]);
  const [selectedBranches, setSelectedBranches] = useState(["All"]);

  useEffect(() => {
  Promise.all([
    base44.entities.Order.list("-created_date", 2000),
    base44.entities.Branch.list("name", 100),
  ]).then(([orderData, branchData]) => {
    setOrders(orderData || []);

    const fromOrders = [...new Set(
      (orderData || [])
        .map(o => o.branch_name || o.branch)
        .filter(b => b && b !== "All Branches")
    )].sort();

    if (fromOrders.length > 0) {
      setAllBranches(fromOrders);
    } else {
      const fromEntity = (branchData || []).map(b => b.name).filter(Boolean);
      setAllBranches(fromEntity.length > 0 ? fromEntity : ["Main Branch"]);
    }
    setLoading(false);
  }).catch(() => setLoading(false));
}, []);

  const toggleMonth = (m) => {
    if (m === "All") { setSelectedMonths(["All"]); return; }
    setSelectedMonths(prev => {
      const next = prev.filter(x => x !== "All");
      return next.includes(m) ? (next.filter(x => x !== m).length ? next.filter(x => x !== m) : ["All"]) : [...next, m];
    });
  };

  const toggleBranch = (b) => {
    if (b === "All") { setSelectedBranches(["All"]); return; }
    setSelectedBranches(prev => {
      const next = prev.filter(x => x !== "All");
      return next.includes(b) ? (next.filter(x => x !== b).length ? next.filter(x => x !== b) : ["All"]) : [...next, b];
    });
  };

  const activeBranches = selectedBranches.includes("All") ? allBranches : selectedBranches;

  // Filter orders by selected months
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.created_date) return false;
      const month = MONTHS[new Date(o.created_date).getMonth()];
      return selectedMonths.includes("All") || selectedMonths.includes(month);
    });
  }, [orders, selectedMonths]);

  // Revenue by month per branch
  const revenueData = useMemo(() => {
    const monthsToShow = selectedMonths.includes("All") ? MONTHS : MONTHS.filter(m => selectedMonths.includes(m));
    return monthsToShow.map(month => {
      const obj = { month };
      activeBranches.forEach(branch => {
        const branchOrders = filteredOrders.filter(o => {
          const b = o.branch_name || o.branch || "Main Branch";
          const m = MONTHS[new Date(o.created_date).getMonth()];
          return b === branch && m === month;
        });
        obj[branch] = branchOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      });
      return obj;
    });
  }, [filteredOrders, activeBranches, selectedMonths]);

  // Orders count by month per branch
  const ordersData = useMemo(() => {
    const monthsToShow = selectedMonths.includes("All") ? MONTHS : MONTHS.filter(m => selectedMonths.includes(m));
    return monthsToShow.map(month => {
      const obj = { month };
      activeBranches.forEach(branch => {
        obj[branch] = filteredOrders.filter(o => {
          const b = o.branch_name || o.branch || "Main Branch";
          const m = MONTHS[new Date(o.created_date).getMonth()];
          return b === branch && m === month;
        }).length;
      });
      return obj;
    });
  }, [filteredOrders, activeBranches, selectedMonths]);

  // Summary stats per branch
  const stats = useMemo(() => activeBranches.map((branch, i) => {
    const branchOrders = filteredOrders.filter(o => (o.branch_name || o.branch || "Main Branch") === branch);
    const totalRev = branchOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const totalOrds = branchOrders.length;
    return {
      branch,
      revenue: totalRev >= 1000 ? `₹${(totalRev / 1000).toFixed(1)}K` : `₹${totalRev}`,
      orders: totalOrds,
      avg: totalOrds ? `₹${Math.round(totalRev / totalOrds)}` : "—",
      color: COLORS[i % COLORS.length],
    };
  }), [filteredOrders, activeBranches]);

  // Radar: relative performance scores (0-100 normalized)
  const radarData = useMemo(() => {
    if (!activeBranches.length) return [];
    const metrics = ["Revenue", "Orders", "Avg Ticket"];
    const raw = activeBranches.map(branch => {
      const branchOrds = filteredOrders.filter(o => (o.branch_name || o.branch || "Main Branch") === branch);
      const rev = branchOrds.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const cnt = branchOrds.length;
      return { branch, rev, cnt, avg: cnt ? rev / cnt : 0 };
    });
    const maxRev = Math.max(...raw.map(r => r.rev), 1);
    const maxCnt = Math.max(...raw.map(r => r.cnt), 1);
    const maxAvg = Math.max(...raw.map(r => r.avg), 1);

    return metrics.map(metric => {
      const obj = { metric };
      raw.forEach(r => {
        if (metric === "Revenue") obj[r.branch] = Math.round((r.rev / maxRev) * 100);
        if (metric === "Orders")  obj[r.branch] = Math.round((r.cnt / maxCnt) * 100);
        if (metric === "Avg Ticket") obj[r.branch] = Math.round((r.avg / maxAvg) * 100);
      });
      return obj;
    });
  }, [filteredOrders, activeBranches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="p-6 space-y-4">
        <div><h1 className="text-2xl font-bold text-foreground">Branch Comparison</h1></div>
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground text-sm">
          No orders found. Orders need a <code className="text-xs bg-white/10 px-1 rounded">branch_name</code> field to compare branches.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Branch Comparison</h1>
        <p className="text-sm text-muted-foreground">Live performance comparison from real order data</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Branches</p>
          <div className="flex flex-wrap gap-2">
            {["All", ...allBranches].map(b => (
              <button key={b} onClick={() => toggleBranch(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  (b === "All" && selectedBranches.includes("All")) || selectedBranches.includes(b)
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                }`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Months</p>
          <div className="flex flex-wrap gap-1">
            {["All", ...MONTHS].map(m => (
              <button key={m} onClick={() => toggleMonth(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  (m === "All" && selectedMonths.includes("All")) || selectedMonths.includes(m)
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.branch} className="glass rounded-2xl p-4 hover:glow-orange transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <h3 className="text-xs font-semibold text-foreground truncate">{s.branch}</h3>
            </div>
            <p className="text-2xl font-bold text-primary">{s.revenue}</p>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
              <span>{s.orders} orders</span>
              <span>Avg {s.avg}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Line Chart */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
            <YAxis stroke={AXIS_COLOR} fontSize={10} tick={TICK_STYLE} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => `₹${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
            {activeBranches.map((b, i) => (
              <Line key={b} type="monotone" dataKey={b} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders Bar Chart */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Orders by Month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
              <YAxis stroke={AXIS_COLOR} fontSize={10} tick={TICK_STYLE} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
              {activeBranches.map((b, i) => (
                <Bar key={b} dataKey={b} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Performance Radar</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Normalized scores (100 = best performing branch)</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={GRID_COLOR} />
              <PolarAngleAxis dataKey="metric" stroke={AXIS_COLOR} fontSize={11} tick={TICK_STYLE} />
              {activeBranches.map((b, i) => (
                <Radar key={b} name={b} dataKey={b} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
