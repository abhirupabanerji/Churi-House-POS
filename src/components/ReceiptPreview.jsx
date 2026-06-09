import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_ORDER = {
  order_number: "CH-A1B2C",
  type: "dine_in",
  table_number: "T-08",
  customer_name: "John Doe",
  customer_phone: "9876543210",
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

const ORDER_TYPE_LABELS = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  swiggy: "Swiggy",
  zomato: "Zomato",
};

const ORDER_TYPE_COLORS = {
  dine_in: "bg-blue-100 text-blue-700",
  takeaway: "bg-purple-100 text-purple-700",
  swiggy: "bg-orange-100 text-orange-700",
  zomato: "bg-red-100 text-red-700",
};

export default function ReceiptPreview({ settings, order = SAMPLE_ORDER, onClose }) {
  const handlePrint = () => window.print();

  const billedBy = order.billed_by || "—";
  const orderTypeLabel = ORDER_TYPE_LABELS[order.type] || order.type;
  const orderTypeColor = ORDER_TYPE_COLORS[order.type] || "bg-gray-100 text-gray-700";

  // Resolve all settings with no hardcoded fallbacks
  const header   = settings?.receipt_header || "Churi House";
  const tagline  = settings?.tagline || "";
  const address  = settings?.address || "";
  const phone    = settings?.phone || "";
  const gstin    = settings?.gstin || "";
  const footer   = settings?.receipt_footer || "Thank you!";
  const note     = settings?.receipt_note || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Receipt Preview</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs bg-white/5 border-white/10" onClick={handlePrint}>
              <Printer className="w-3 h-3 mr-1" /> Print
            </Button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="bg-white text-black rounded-xl p-5 font-mono text-xs space-y-2 print:shadow-none" id="receipt-content">
          {settings?.receipt_logo_url && (
            <img src={settings.receipt_logo_url} className="h-10 mx-auto mb-2" alt="logo" />
          )}

          {/* Header */}
          <div className="text-center border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold text-sm">{header}</p>
            {tagline && <p className="text-gray-400 text-[10px] italic">{tagline}</p>}
            {settings?.show_branch_address && address && (
              <p className="text-gray-500 text-[10px]">{address}</p>
            )}
            {settings?.show_phone && phone && (
              <p className="text-gray-500 text-[10px]">Tel: {phone}</p>
            )}
            {settings?.show_gst && gstin && (
              <p className="text-gray-500 text-[10px]">GSTIN: {gstin}</p>
            )}
          </div>

          {/* Order Info */}
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Order #{order.order_number}</span>
            <span>{new Date().toLocaleString()}</span>
          </div>

          {/* Order Type Badge + Table */}
          {settings?.show_order_type && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] ${orderTypeColor}`}>
                {orderTypeLabel}
              </span>
              {order.table_number && (
                <span className="text-gray-500">Table: {order.table_number}</span>
              )}
              {settings?.show_server_name && order.billed_by && (
                <span className="text-gray-500 ml-auto">Server: {order.billed_by}</span>
              )}
            </div>
          )}

          {/* Customer Info */}
          {(order.customer_name || order.customer_phone) && (
            <div className="text-[10px] text-gray-500 border-b border-dashed border-gray-200 pb-1">
              {order.customer_name && <div>Customer: <span className="text-black font-medium">{order.customer_name}</span></div>}
              {order.customer_phone && <div>Phone: <span className="text-black">{order.customer_phone}</span></div>}
            </div>
          )}

          {/* Items */}
          <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>₹{(item.quantity * item.price).toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(0)}</span></div>
            {settings?.show_discount && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount ?? 0}</span></div>
            )}
            {settings?.show_gst && (
              <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>₹{Number(order.tax).toFixed(1)}</span></div>
            )}
            {settings?.show_payment_method && order.payment_method && (
              <div className="flex justify-between text-gray-500 text-[10px]"><span>Payment</span><span className="capitalize">{order.payment_method}</span></div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
              <span>TOTAL</span><span>₹{Number(order.total).toFixed(0)}</span>
            </div>
          </div>

          {/* Billed By */}
          <div className="border-t border-dashed border-gray-300 pt-2">
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Billed by</span>
              <span>{billedBy}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-dashed border-gray-300 pt-2 space-y-0.5">
            <p className="font-semibold">{footer}</p>
            {note && <p className="text-gray-400 text-[9px]">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}