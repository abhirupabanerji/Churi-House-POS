import { QrCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABLES_QR = Array.from({ length: 12 }, (_, i) => ({ table: `T-0${i + 1}`, scans: Math.floor(Math.random() * 20), orders: Math.floor(Math.random() * 8) }));

export default function QROrdering() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">QR Code Ordering</h1><p className="text-sm text-muted-foreground">Table QR scan-to-order system</p></div>
        <Button className="bg-primary hover:bg-primary/90 glow-orange"><Download className="w-4 h-4 mr-1" /> Export All QRs</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {TABLES_QR.map((t) => (
          <div key={t.table} className="glass rounded-2xl p-4 text-center hover:glow-orange transition-all">
            <QrCode className="w-10 h-10 mx-auto text-primary mb-2" />
            <p className="text-sm font-bold text-foreground">{t.table}</p>
            <p className="text-[10px] text-muted-foreground">{t.scans} scans</p>
            <p className="text-[10px] text-primary">{t.orders} orders</p>
          </div>
        ))}
      </div>
    </div>
  );
}