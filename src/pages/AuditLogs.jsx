import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const typeColor = {
  order: "bg-blue-500/10 text-blue-400",
  menu: "bg-primary/10 text-primary",
  auth: "bg-green-500/10 text-green-400",
  finance: "bg-yellow-500/10 text-yellow-400",
  inventory: "bg-purple-500/10 text-purple-400",
  admin: "bg-red-500/10 text-red-400",
  staff: "bg-cyan-500/10 text-cyan-400",
  system: "bg-muted text-muted-foreground",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    base44.entities.AuditLog.list("-created_date", 200)
      .then(d => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    (typeFilter === "all" || l.type === typeFilter) &&
    (search === "" || `${l.action} ${l.details} ${l.user}`.toLowerCase().includes(search.toLowerCase()))
  );

  const fmt = (ts) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }); } catch { return ts; }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Audit Logs</h1><p className="text-sm text-muted-foreground">{filtered.length} of {logs.length} records</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-10 h-9 bg-white/5 border-white/10 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all","auth","order","finance","inventory","admin","staff","system"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter===t ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : (
        filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <FileSearch className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">{logs.length === 0 ? "No activity logged yet. Actions taken in the system will appear here." : "No matching logs."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((l, i) => (
              <div key={l.id || i} className="glass rounded-xl px-5 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 mt-0.5 ${typeColor[l.type] || typeColor.system}`}>{l.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{l.action}</p>
                  <p className="text-xs text-muted-foreground">{l.details}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {l.user && <p className="text-xs text-muted-foreground">by <span className="text-primary">{l.user}</span></p>}
                    {l.branch && <p className="text-xs text-muted-foreground">· {l.branch}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmt(l.timestamp || l.created_date)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}