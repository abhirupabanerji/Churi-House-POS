import { useState, useEffect, useMemo, useCallback } from "react";
import { Building2, TableIcon, Bell, AlertTriangle, CheckCircle, Info, IndianRupee, ShoppingCart, Users, TrendingUp, Clock, Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/dashboard/StatCard";
import { useTheme } from "@/lib/ThemeContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrentUserBranch } from "@/lib/branchFilter";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: 12,
  fontSize: 12,
};

const ORDER_TYPE_COLORS = {
  dine_in: "#ea580c", takeaway: "#f97316", delivery: "#fb923c",
  swiggy: "#fdba74", zomato: "#fed7aa",
};

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400",
  preparing: "bg-blue-500/20 text-blue-400",
  ready: "bg-green-500/20 text-green-400",
  served: "bg-purple-500/20 text-purple-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/20 text-red-400",
};

// Revenue counts all non-cancelled orders (pending/preparing/ready/served/completed)
const REVENUE_STATUSES = ["pending", "preparing", "ready", "served", "completed"];

export default function Dashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tables, setTables] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const { branch, isAllBranches } = getCurrentUserBranch();

  const fetchData = useCallback(() => {
    base44.entities.Branch.list().then(d => setBranches(d || [])).catch(() => {});
    base44.entities.Order.list("-created_date", 500).then(d => setAllOrders(d || [])).catch(() => {});
    base44.entities.InventoryItem.list().then(d => setInventory(d || [])).catch(() => {});
    base44.entities.Table.list("num", 200).then(d => setTables(d || [])).catch(() => {});
    setLastRefresh(Date.now());
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll every 30 seconds for live updates
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time subscription for new/updated orders
  useEffect(() => {
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === "create") {
        setAllOrders(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setAllOrders(prev => prev.map(o => o.id === event.data?.id ? event.data : o));
      } else if (event.type === "delete") {
        setAllOrders(prev => prev.filter(o => o.id !== event.data?.id));
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = base44.entities.Table.subscribe((event) => {
      if (event.type === "create") {
        setTables(prev => [...prev, event.data].sort((a, b) => (a.num || 0) - (b.num || 0)));
      } else if (event.type === "update") {
        setTables(prev => prev.map(t => t.id === event.data?.id ? event.data : t));
      } else if (event.type === "delete") {
        setTables(prev => prev.filter(t => t.id !== event.data?.id));
      }
    });
    return unsub;
  }, []);

  // Filter orders by branch
  const branchOrders = useMemo(() => {
    if (isAllBranches) return allOrders;
    return allOrders.filter(o =>
      (o.branch_name || o.branch || "").toLowerCase() === branch.toLowerCase()
    );
  }, [allOrders, branch, isAllBranches]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = branchOrders.filter(o => o.created_date?.slice(0, 10) === todayStr);

  // Active = not yet completed/cancelled
  const activeOrders = todayOrders.filter(o => ["pending", "preparing", "ready"].includes(o.status));

  // Revenue = all non-cancelled orders today (not just completed)
  const revenueOrders = todayOrders.filter(o => REVENUE_STATUSES.includes(o.status));
  const todayRevenue = revenueOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avgOrderValue = revenueOrders.length ? Math.round(todayRevenue / revenueOrders.length) : 0;

  // Items sold from all today's non-cancelled orders
  const itemsSold = revenueOrders.reduce((s, o) =>
    s + (o.items?.reduce((a, i) => a + (i.quantity || 1), 0) || 0), 0
  );

  const customersToday = new Set(
    revenueOrders.map(o => o.customer_phone || o.customer_name).filter(Boolean)
  ).size || revenueOrders.length;

  const weeklyRevenue = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { name: days[d.getDay()], revenue: 0 };
    }
    branchOrders.forEach(o => {
      const day = o.created_date?.slice(0, 10);
      if (map[day] && REVENUE_STATUSES.includes(o.status)) {
        map[day].revenue += (Number(o.total) || 0);
      }
    });
    return Object.values(map);
  }, [branchOrders]);

  const orderTypeData = useMemo(() => {
    const counts = {};
    branchOrders.forEach(o => { counts[o.type] = (counts[o.type] || 0) + 1; });
    return Object.entries(counts).map(([type, value]) => ({
      name: type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value,
      color: ORDER_TYPE_COLORS[type] || "#ea580c",
    }));
  }, [branchOrders]);

  const hourlyData = useMemo(() => {
    const map = {};
    for (let h = 8; h <= 22; h++) map[h] = { hour: `${h}:00`, orders: 0 };
    todayOrders.forEach(o => {
      const h = o.created_date ? new Date(o.created_date).getHours() : null;
      if (h !== null && map[h]) map[h].orders++;
    });
    return Object.values(map);
  }, [todayOrders]);

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = { month: months[d.getMonth()], revenue: 0 };
    }
    branchOrders.forEach(o => {
      const key = o.created_date?.slice(0, 7);
      if (map[key] && REVENUE_STATUSES.includes(o.status)) {
        map[key].revenue += (Number(o.total) || 0);
      }
    });
    return Object.values(map).map(d => ({ ...d, revenue: +(d.revenue / 100000).toFixed(2) }));
  }, [branchOrders]);

  const GRID_COLOR = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const AXIS_COLOR = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";

  const topItemsData = useMemo(() => {
    const counts = {};
    branchOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.name) counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, sold]) => ({ name, sold }));
  }, [branchOrders]);

  const channelRevenueData = useMemo(() => {
    const map = {};
    branchOrders.forEach(o => {
      if (!REVENUE_STATUSES.includes(o.status)) return;
      const ch = (o.type || "other").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (!map[ch]) map[ch] = { channel: ch, revenue: 0, orders: 0 };
      map[ch].revenue += (Number(o.total) || 0);
      map[ch].orders++;
    });
    return Object.values(map);
  }, [branchOrders]);

  const lowStockItems = inventory.filter(i => i.stock <= i.min_level);

  const stateWise = branches.reduce((acc, b) => {
    const state = b.city || "Unknown";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const availableTables = useMemo(() => {
    return tables.filter((table) => String(table.status || "").toLowerCase() === "available").length;
  }, [tables]);

  const ALERTS = [
    ...lowStockItems.slice(0, 2).map(i => ({
      type: i.stock <= 0 ? "critical" : "warning",
      icon: AlertTriangle,
      color: i.stock <= 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      message: `${i.name} is ${i.stock <= 0 ? "out of stock" : `low (${i.stock} ${i.unit} remaining)`}`,
      time: "Now",
    })),
    activeOrders.length > 10 ? { type: "info", icon: Info, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", message: `${activeOrders.length} active orders in kitchen — peak hour detected`, time: "Now" } : null,
    todayRevenue >= 100000 ? { type: "success", icon: CheckCircle, color: "text-green-400 bg-green-500/10 border-green-500/20", message: `Today's revenue ₹${todayRevenue.toLocaleString("en-IN")} — target achieved!`, time: "Today" } : null,
  ].filter(Boolean);

  const recentOrders = branchOrders.slice(0, 5);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isAllBranches ? "Admin Dashboard" : `${branch} Dashboard`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back — {isAllBranches ? "showing all branches" : `showing ${branch} only`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground">
              Updated {new Date(lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl hover:glow-orange transition-all">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Today's Revenue" value={`₹${todayRevenue.toLocaleString("en-IN")}`} change="" icon={IndianRupee} onClick={() => navigate("/reports")} />
          <StatCard title="Total Orders Today" value={String(todayOrders.length)} change="" icon={ShoppingCart} onClick={() => navigate("/orders")} />
          <StatCard title="Active Orders" value={String(activeOrders.length)} change="" icon={Clock} onClick={() => navigate("/kitchen")} />
          <StatCard title="Avg Order Value" value={`₹${avgOrderValue.toLocaleString("en-IN")}`} change="" icon={TrendingUp} onClick={() => navigate("/reports")} />
          <StatCard title="Customers Today" value={String(customersToday)} change="" icon={Users} onClick={() => navigate("/orders")} />
          <StatCard title="Items Sold" value={String(itemsSold)} change="" icon={Utensils} onClick={() => navigate("/menu")} />
          <ShadTooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <StatCard title="Total Branches" value={String(branches.length || 0)} change="" icon={Building2} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3 bg-card border border-border rounded-xl shadow-xl min-w-[160px]">
              <p className="text-xs font-semibold text-foreground mb-2">City-wise Distribution</p>
              {Object.keys(stateWise).length === 0 ? (
                <p className="text-xs text-muted-foreground">No branch data yet</p>
              ) : (
                Object.entries(stateWise).map(([state, count]) => (
                  <div key={state} className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-muted-foreground">{state}</span>
                    <span className="text-xs font-semibold text-primary ml-6">{count}</span>
                  </div>
                ))
              )}
            </TooltipContent>
          </ShadTooltip>
          <StatCard title="Available Tables" value={String(availableTables)} change="" icon={TableIcon} onClick={() => navigate("/tables")} />
        </div>

        {ALERTS.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Alerts &amp; Notifications</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{ALERTS.filter(a => a.type === "critical").length} critical</span>
            </div>
            <div className="space-y-2">
              {ALERTS.map((alert, i) => {
                const Icon = alert.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${alert.color}`}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground flex-1">{alert.message}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{alert.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Weekly Revenue (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weeklyRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={11} />
                <YAxis stroke={AXIS_COLOR} fontSize={11} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Order Distribution</h3>
            {orderTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No orders yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={orderTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {orderTypeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [v, "Orders"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {orderTypeData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Hourly Orders (Today)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="hour" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis stroke={AXIS_COLOR} fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="orders" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top Selling Items</h3>
            {topItemsData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No sales data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topItemsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis type="number" stroke={AXIS_COLOR} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={AXIS_COLOR} fontSize={10} width={90} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [v, "Units Sold"]} />
                  <Bar dataKey="sold" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue Trend (₹ Lakhs)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={11} />
                <YAxis stroke={AXIS_COLOR} fontSize={11} tickFormatter={v => `₹${v}L`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [`₹${v}L`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={2.5} dot={{ fill: "#ea580c", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Channel</h3>
            {channelRevenueData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={channelRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="channel" stroke={AXIS_COLOR} fontSize={10} />
                  <YAxis stroke={AXIS_COLOR} fontSize={10} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [`₹${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-foreground">#{o.order_number}</span>
                    <span className="text-xs text-muted-foreground">{o.type?.replace(/_/g, " ")}</span>
                    {o.table_number && <span className="text-xs text-primary">T-{o.table_number}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[o.status] || statusColors.pending}`}>{o.status}</span>
                    <span className="text-sm font-medium text-foreground">₹{(o.total || 0).toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {o.created_date ? new Date(o.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
