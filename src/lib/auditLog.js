import { base44 } from "@/api/base44Client";
import { getSession } from "@/lib/restaurantAuth";

export async function logAudit({ action, type = "system", details = "" }) {
  const session = getSession();
  try {
    await base44.entities.AuditLog.create({
      action,
      type,
      details,
      user: session?.full_name || session?.username || "System",
      role: session?.role || "unknown",
      branch: session?.franchise || "",
      timestamp: new Date().toISOString(),
    });
  } catch {}
}