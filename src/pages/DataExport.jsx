import { useState } from "react";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const EXPORTS = [
  { id: "orders", name: "Sales / Orders Report", desc: "All orders with items, totals, and status", entity: "Order" },
  { id: "expenses", name: "Spending / Expenses", desc: "All expense records by category", entity: "Expense" },
  { id: "inventory", name: "Inventory Report", desc: "Current stock levels and costs", entity: "InventoryItem" },
  { id: "vendors", name: "Vendor List", desc: "All vendors with balances and status", entity: "Vendor" },
  { id: "vendor_payments", name: "Vendor Payments", desc: "All vendor payment records", entity: "VendorPayment" },
  { id: "staff", name: "Staff / Attendance", desc: "Attendance and shift records", entity: "Attendance" },
  { id: "reservations", name: "Reservations", desc: "Table reservations with status", entity: "Reservation" },
  { id: "purchase_orders", name: "Purchase Orders", desc: "All PO records with payment status", entity: "PurchaseOrder" },
  { id: "tax_records", name: "GST / Tax Report", desc: "Tax records for filing", entity: "TaxRecord" },
];

function downloadCSV(data, filename) {
  if (!data.length) { toast.error("No data found to export"); return false; }
  const skipKeys = ["created_by"];
  const keys = Object.keys(data[0]).filter(k => !skipKeys.includes(k));
  const csv = [
    keys.join(","),
    ...data.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return true;
}

export default function DataExport() {
  const [loading, setLoading] = useState({});
  const [done, setDone] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleExport = async (exp) => {
    setLoading(l => ({ ...l, [exp.id]: true }));
    const data = await base44.entities[exp.entity].list("-created_date", 5000).catch(() => []);
    const filtered = data.filter(r => {
      const d = r.created_date || r.date || r.paid_date;
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo + "T23:59:59") return false;
      return true;
    });
    const filename = `${exp.id}_${new Date().toISOString().split("T")[0]}.csv`;
    const success = downloadCSV(filtered.length ? filtered : data, filename);
    setLoading(l => ({ ...l, [exp.id]: false }));
    if (success) {
      toast.success(`${exp.name} exported!`);
      setDone(d => ({ ...d, [exp.id]: true }));
      setTimeout(() => setDone(d => ({ ...d, [exp.id]: false })), 3000);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Data Export</h1>
        <p className="text-sm text-muted-foreground">Export business data as CSV files</p>
      </div>

      {/* Date Filter */}
      <div className="glass rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Filter by Date Range</p>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 bg-white/5 border-white/10 text-xs w-36" />
            <span className="text-muted-foreground text-xs">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 bg-white/5 border-white/10 text-xs w-36" />
            {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-primary hover:underline">Clear</button>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground self-end pb-1">Leave empty to export all records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORTS.map((exp) => (
          <div key={exp.id} className="glass rounded-2xl p-5 hover:glow-orange transition-all">
            <h3 className="text-sm font-semibold text-foreground">{exp.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{exp.desc}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">CSV Format</p>
            <Button
              size="sm"
              onClick={() => handleExport(exp)}
              disabled={!!loading[exp.id]}
              className={`mt-4 w-full h-8 text-xs ${done[exp.id] ? "bg-green-600 hover:bg-green-700" : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"}`}
            >
              {loading[exp.id] ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                : done[exp.id] ? <CheckCircle className="w-3 h-3 mr-1.5" />
                : <Download className="w-3 h-3 mr-1.5" />}
              {loading[exp.id] ? "Fetching..." : done[exp.id] ? "Downloaded!" : "Export CSV"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}