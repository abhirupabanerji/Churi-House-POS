import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, Flame, ChefHat, CheckCircle } from "lucide-react";

const urgencyColor = (mins) => {
  if (mins > 15) return "border-red-500 glow-orange-strong";
  if (mins > 8) return "border-yellow-500";
  return "border-green-500/30";
};

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = () => {
      base44.entities.Order.filter(
        { status: ["pending", "preparing", "ready"] },
        "-created_date", 30
      ).then(setOrders).catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Order.update(id, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready");

  const OrderCard = ({ order }) => {
    const mins = Math.floor((Date.now() - new Date(order.created_date).getTime()) / 60000);
    return (
      <div className={`glass rounded-2xl p-4 border-l-4 ${urgencyColor(mins)} transition-all`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-mono font-bold text-foreground">{order.order_number}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{mins}m</span>
            {mins > 15 && <Flame className="w-3 h-3 text-red-400 animate-pulse" />}
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{item.quantity}</span>
              <span className="text-sm text-foreground">{item.name}</span>
              {item.notes && <span className="text-[10px] text-yellow-400 ml-auto">⚠ {item.notes}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {order.status === "pending" && (
            <Button size="sm" className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-xs font-semibold" onClick={() => updateStatus(order.id, "preparing")}>
              <ChefHat className="w-3.5 h-3.5 mr-1" /> Start Cooking
            </Button>
          )}
          {order.status === "preparing" && (
            <Button size="sm" className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-xs font-semibold" onClick={() => updateStatus(order.id, "ready")}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Ready
            </Button>
          )}
          {order.status === "ready" && (
            <Button size="sm" className="flex-1 h-9 bg-purple-600 hover:bg-purple-700 text-xs font-semibold" onClick={() => updateStatus(order.id, "served")}>
              Served
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <ChefHat className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kitchen Display</h1>
          <p className="text-sm text-muted-foreground">{orders.length} active orders</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live updates</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h2 className="text-sm font-semibold text-foreground">Pending</h2>
            <span className="text-xs text-muted-foreground ml-auto">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((o) => <OrderCard key={o.id} order={o} />)}
            {pending.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No pending orders</p>}
          </div>
        </div>
        {/* Preparing */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">Preparing</h2>
            <span className="text-xs text-muted-foreground ml-auto">{preparing.length}</span>
          </div>
          <div className="space-y-3">
            {preparing.map((o) => <OrderCard key={o.id} order={o} />)}
            {preparing.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nothing cooking</p>}
          </div>
        </div>
        {/* Ready */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="text-sm font-semibold text-foreground">Ready</h2>
            <span className="text-xs text-muted-foreground ml-auto">{ready.length}</span>
          </div>
          <div className="space-y-3">
            {ready.map((o) => <OrderCard key={o.id} order={o} />)}
            {ready.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No ready orders</p>}
          </div>
        </div>
      </div>
    </div>
  );
}