// src/lib/lowStockAlert.js
import { base44 } from "@/api/base44Client";

/**
 * Creates in-app notifications for low/critical stock items.
 * @param {Array} items - inventory items to check
 * @returns {{ sent: boolean, count: number, error?: string }}
 */
export async function sendLowStockAlerts(items) {
  try {
    const normalised = items.map(i => ({
      ...i,
      stock: Number(i.stock ?? 0),
      min_level: Number(i.min_level ?? 0),
      unit: i.unit ?? "units",
      name: i.name ?? "Unknown Item",
    }));

    const criticalItems = normalised.filter(i => i.stock <= 0);
    const lowItems = normalised.filter(i => i.stock > 0 && i.stock <= i.min_level);

    if (!criticalItems.length && !lowItems.length) {
      return { sent: false, count: 0 };
    }

    const now = new Date().toISOString();

    // Create one notification per item so each shows individually in the bell
    const allAlertItems = [
      ...criticalItems.map(i => ({ ...i, alertType: "critical" })),
      ...lowItems.map(i => ({ ...i, alertType: "low" })),
    ];

    for (const item of allAlertItems) {
      await base44.entities.Notification.create({
        type: "low_stock",
        title: item.alertType === "critical"
          ? `🔴 Out of Stock: ${item.name}`
          : `🟡 Low Stock: ${item.name}`,
        message: item.alertType === "critical"
          ? `${item.name} is completely out of stock. Current: ${Math.max(0, item.stock)} ${item.unit}, Min: ${item.min_level} ${item.unit}`
          : `${item.name} is running low. Current: ${item.stock} ${item.unit}, Min: ${item.min_level} ${item.unit}`,
        read: false,
        created_date: now,
        item_name: item.name,
        item_stock: Math.max(0, item.stock),
        item_unit: item.unit,
        item_min_level: item.min_level,
        alert_type: item.alertType,
      });
    }

    console.log(`Low stock: ${allAlertItems.length} in-app notifications created.`);
    return { sent: true, count: allAlertItems.length };

  } catch (err) {
    console.error("Low stock alert error:", err);
    return { sent: false, count: 0, error: err.message };
  }
}