import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend } from "recharts";

const ALL_BRANCHES = ["Main Branch", "Jubilee Hills", "Banjara Hills", "Secunderabad"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#ea580c", "#f59e0b", "#10b981", "#3b82f6"];
const tt = { background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 };

// Stable data seeded by branch and month index
function branchRevenue(branchIdx, monthIdx) {
  const base = [280000, 210000, 190000, 150000][branchIdx];
  const seed = (branchIdx * 12 + monthIdx) * 17 % 100;
  return base + (seed * 1500);
}
function branchOrders(branchIdx, monthIdx) {
  const base = [400, 300, 200, 150][branchIdx];
  const seed = (branchIdx * 12 + monthIdx) * 13 % 100;
  return base + seed * 3;
}

const ALL_MONTHLY_DATA = MONTHS.map((m, mi) => {
  const obj = { month: m };
  ALL_BRANCHES.forEach((b, bi) => { obj[b] = branchRevenue(bi, mi); });
  return obj;
});
const ALL_ORDERS_DATA = MONTHS.map((m, mi) => {
  const obj = { month: m };
  ALL_BRANCHES.forEach((b, bi) => { obj[b] = branchOrders(bi, mi); });
  return obj;
});

const radarData = [
  { metric: "Revenue", "Main Branch": 90, "Jubilee Hills": 72, "Banjara Hills": 64, "Secunderabad": 55 },
  { metric: "Orders",  "Main Branch": 85, "Jubilee Hills": 78, "Banjara Hills": 60, "Secunderabad": 50 },
  { metric: "Avg Ticket","Main Branch":76,"Jubilee Hills":68,"Banjara Hills":72,"Secunderabad":62 },
  { metric: "Rating",  "Main Branch": 88, "Jubilee Hills": 82, "Banjara Hills": 79, "Secunderabad": 70 },
  { metric: "Occupancy","Main Branch":92,"Jubilee Hills":75,"Banjara Hills":65,"Secunderabad":60 },
];

export default function BranchComparison() {
  const [selectedMonths, setSelectedMonths] = useState(["All"]);
  const [selectedBranches, setSelectedBranches] = useState(["All"]);

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

  const activeBranches = selectedBranches.includes("All") ? ALL_BRANCHES : selectedBranches;

  const revenueData = useMemo(() => {
    const base = selectedMonths.includes("All") ? ALL_MONTHLY_DATA : ALL_MONTHLY_DATA.filter(d => selectedMonths.includes(d.month));
    return base.map(d => {
      const obj = { month: d.month };
      activeBranches.forEach(b => { obj[b] = d[b]; });
      return obj;
    });
  }, [selectedMonths, activeBranches]);

  const ordersData = useMemo(() => {
    const base = selectedMonths.includes("All") ? ALL_ORDERS_DATA : ALL_ORDERS_DATA.filter(d => selectedMonths.includes(d.month));
    return base.map(d => {
      const obj = { month: d.month };
      activeBranches.forEach(b => { obj[b] = d[b]; });
      return obj;
    });
  }, [selectedMonths, activeBranches]);

  const stats = activeBranches.map((branch, i) => {
    const bi = ALL_BRANCHES.indexOf(branch);
    const totalRev = revenueData.reduce((s, d) => s + (d[branch] || 0), 0);
    const totalOrds = ordersData.reduce((s, d) => s + (d[branch] || 0), 0);
    return { branch, revenue: `₹${(totalRev/1000).toFixed(0)}K`, orders: totalOrds, avg: totalOrds ? `₹${Math.round(totalRev/totalOrds)}` : "—", color: COLORS[bi % COLORS.length] };
  });

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Branch Comparison</h1><p className="text-sm text-muted-foreground">Performance comparison across branches</p></div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Branches</p>
          <div className="flex flex-wrap gap-2">
            {["All", ...ALL_BRANCHES].map(b => (
              <button key={b} onClick={() => toggleBranch(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${(selectedBranches.includes(b) || (b === "All" && selectedBranches.includes("All"))) ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
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
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${(selectedMonths.includes(m) || (m === "All" && selectedMonths.includes("All"))) ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.branch} className="glass rounded-2xl p-4 hover:glow-orange transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <h3 className="text-xs font-semibold text-foreground">{s.branch}</h3>
            </div>
            <p className="text-2xl font-bold text-primary">{s.revenue}</p>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
              <span>{s.orders} orders</span>
              <span>Avg {s.avg}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.5)" }} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tick={{ fill: "rgba(255,255,255,0.5)" }} />
            <Tooltip contentStyle={tt} formatter={(v) => `₹${v.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
            {activeBranches.map((b, i) => <Line key={b} type="monotone" dataKey={b} stroke={COLORS[ALL_BRANCHES.indexOf(b) % COLORS.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Orders Comparison</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tick={{ fill: "rgba(255,255,255,0.5)" }} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tick={{ fill: "rgba(255,255,255,0.5)" }} />
              <Tooltip contentStyle={tt} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              {activeBranches.map((b) => <Bar key={b} dataKey={b} fill={COLORS[ALL_BRANCHES.indexOf(b) % COLORS.length]} radius={[3,3,0,0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance Radar</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              {activeBranches.map((b) => <Radar key={b} name={b} dataKey={b} stroke={COLORS[ALL_BRANCHES.indexOf(b) % COLORS.length]} fill={COLORS[ALL_BRANCHES.indexOf(b) % COLORS.length]} fillOpacity={0.1} />)}
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              <Tooltip contentStyle={tt} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}