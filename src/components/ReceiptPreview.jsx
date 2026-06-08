import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_ORDER = {
  order_number: "CH-A1B2C",
  type: "Dine-in",
  table_number: "T-08",
  items: [
    { name: "Butter Chicken", quantity: 2, price: 320 },
    { name: "Garlic Naan", quantity: 4, price: 60 },
    { name: "Dal Makhani", quantity: 1, price: 240 },
  ],
  subtotal: 1160,
  discount: 58,
  tax: 55.1,
  total: 1157.1,
};

export default function ReceiptPreview({ settings, order = SAMPLE_ORDER, onClose }) {
  const handlePrint = () => window.print();

  const currentUser = (() => {
    try {
      const val = JSON.parse(localStorage.getItem("ch_AppUser") || "{}");
      return Array.isArray(val) ? val[0] : val;
    } catch { return {}; }
  })();
  const billedBy = currentUser.full_name || currentUser.username || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Receipt Preview</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10" onClick={handlePrint}><Printer className="w-3 h-3 mr-1" /> Print</Button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Receipt Paper */}
        <div className="bg-white text-black rounded-xl p-5 font-mono text-xs space-y-2 print:shadow-none" id="receipt-content">
          {settings?.receipt_logo_url && <img src={settings.receipt_logo_url} className="h-10 mx-auto mb-2" alt="logo" />}
          <div className="text-center border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold text-sm">{settings?.receipt_header || "Churi House"}</p>
            {settings?.show_branch_address && <p className="text-gray-500 text-[10px]">123 Main Street, Hyderabad</p>}
            <p className="text-gray-500 text-[10px]">Tel: +91 98765 43210</p>
            {settings?.show_gst && <p className="text-gray-500 text-[10px]">GSTIN: 36AABCU9603R1ZX</p>}
          </div>

          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Order #{order.order_number}</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{order.type} | {order.table_number}</span>
            {settings?.show_server_name && <span>Server: Ramesh</span>}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>₹{(item.quantity * item.price).toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{order.subtotal.toFixed(0)}</span></div>
            {settings?.show_discount && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount}</span></div>}
            {settings?.show_gst && <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>₹{order.tax.toFixed(1)}</span></div>}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300"><span>TOTAL</span><span>₹{order.total.toFixed(0)}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2">
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Billed by</span>
              <span>{billedBy}</span>
            </div>
          </div>

          <div className="text-center border-t border-dashed border-gray-300 pt-2 space-y-0.5">
            <p className="font-semibold">{settings?.receipt_footer || "Thank you!"}</p>
            {settings?.receipt_note && <p className="text-gray-400 text-[9px]">{settings.receipt_note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
