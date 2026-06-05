/**
 * Soft-delete utility — sends any record to the Recycle Bin (DeletedOrder entity)
 * instead of permanently deleting it.
 *
 * Usage:
 *   import { softDelete } from "@/lib/softDelete";
 *   await softDelete({ module: "MenuItem", id: item.id, name: item.name, data: item });
 */
import { base44 } from "@/api/base44Client";
import { getSession } from "@/lib/restaurantAuth";

export async function softDelete({ module, id, name, data, reason = "" }) {
  const session = getSession();
  await base44.entities.DeletedOrder.create({
    order_number: name || id,
    source_module: module,
    // ✅ Always store the original entity id so restore can recreate it
    original_id: id,
    order_data: JSON.stringify(data || {}),
    deleted_by: session?.full_name || session?.username || "unknown",
    deleted_by_role: session?.role || "",
    deleted_at: new Date().toISOString(),
    bill_generated: false,
    reason,
    restored: false,
    branch_id: session?.branch_id || "",
  });
}