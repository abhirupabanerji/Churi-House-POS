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

  const restaurantName = settings?.restaurant_name || settings?.restaurantName || settings?.store_name || "";
  const branchName = settings?.branch_label || settings?.branchLabel || settings?.branch_name_display || settings?.branch_name || "";
  const displayHeader = [restaurantName, branchName].filter(Boolean).join(" — ");
  const header = displayHeader || settings?.receipt_header || "Churi House";
  const subHeader = settings?.receipt_header && settings.receipt_header !== displayHeader && settings.receipt_header !== restaurantName ? settings.receipt_header : "";
  const tagline     = settings?.tagline || "";
  const address     = settings?.address || "";
  const phone       = settings?.phone || "";
  // ── fixed: was reading settings.gstin, field is gst_number ──
  const gstNumber   = settings?.gst_number || settings?.gstin || "";
  const fssaiNumber = settings?.fssai_number || "";
  const footer      = settings?.receipt_footer || "Thank you!";
  const note        = settings?.receipt_note || "";
  const logoUrl     = settings?.receipt_logo_url || "";
  const qrUrl       = settings?.receipt_qr_url || "";

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

        <div className="bg-white text-black rounded-xl p-5 font-mono text-xs space-y-2 print:shadow-none max-h-[75vh] overflow-y-auto" id="receipt-content">

          {/* Logo — respects show_logo toggle */}
          {settings?.show_logo !== false && logoUrl && (
            <img src={logoUrl} className="h-10 mx-auto mb-2 object-contain" alt="logo" />
          )}

          {/* Header */}
          <div className="text-center border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold text-sm">{header}</p>
            {subHeader && <p className="text-gray-500 text-[10px]">{subHeader}</p>}
            {tagline && <p className="text-gray-400 text-[10px] italic">{tagline}</p>}
            {settings?.show_branch_address !== false && address && (
              <p className="text-gray-500 text-[10px]">{address}</p>
            )}
            {settings?.show_phone !== false && phone && (
              <p className="text-gray-500 text-[10px]">Tel: {phone}</p>
            )}
            {/* GST Number */}
            {settings?.show_gst_number !== false && gstNumber && (
              <p className="text-gray-500 text-[10px]">GSTIN: {gstNumber}</p>
            )}
            {/* FSSAI Number */}
            {settings?.show_fssai_number !== false && fssaiNumber && (
              <p className="text-gray-500 text-[10px]">FSSAI Lic. No: {fssaiNumber}</p>
            )}
          </div>

          {/* Order Info */}
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Order #{order.order_number}</span>
            <span>{new Date().toLocaleString()}</span>
          </div>

          {/* Order Type Badge + Table */}
          {settings?.show_order_type !== false && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] ${orderTypeColor}`}>
                {orderTypeLabel}
              </span>
              {settings?.show_table_number !== false && order.table_number && (
                <span className="text-gray-500">Table: {order.table_number}</span>
              )}
              {settings?.show_server_name && order.billed_by && (
                <span className="text-gray-500 ml-auto">Server: {order.billed_by}</span>
              )}
            </div>
          )}

          {/* Customer Info */}
          {(order.customer_name || order.customer_phone || order.table_number) && (
            <div className="text-[10px] text-gray-500 border-b border-dashed border-gray-200 pb-1 space-y-0.5">
              {order.customer_name && <div>Customer: <span className="text-black font-medium">{order.customer_name}</span></div>}
              {order.customer_phone && <div>Phone: <span className="text-black">{order.customer_phone}</span></div>}
              {order.table_number && <div>Table: <span className="text-black">{order.table_number}</span></div>}
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
            {settings?.show_discount !== false && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount ?? 0}</span></div>
            )}
            {settings?.show_gst !== false && (
              <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>₹{Number(order.tax).toFixed(1)}</span></div>
            )}
            {settings?.show_payment_method !== false && order.payment_method && (
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

          {/* QR Code */}
          {settings?.show_upi_qr !== false && (
            <div className="text-center border-t border-dashed border-gray-300 pt-2">
              <p className="text-[10px] text-gray-500 mb-1">Scan to Pay</p>
              {qrUrl ? (
                <img src={qrUrl} alt="Receipt QR" className="w-16 h-16 mx-auto object-contain rounded border border-gray-300 bg-white p-1" />
              ) : settings?.upi_id ? (
                <div className="w-16 h-16 mx-auto bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                  <span className="text-[8px] text-gray-400 text-center">QR<br/>{settings.upi_id}</span>
                </div>
              ) : null}
            </div>
          )}

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
