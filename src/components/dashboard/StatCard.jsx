import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, change, changeType, icon: Icon, onClick }) {
  const isPositive = changeType === "positive";
  return (
    <div
      className={`glass rounded-2xl p-5 hover:glow-orange transition-all duration-300 group ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {change && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </div>
  );
}