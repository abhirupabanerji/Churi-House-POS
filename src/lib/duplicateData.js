import { base44 } from "@/api/base44Client";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

export async function cleanupDuplicateInventoryItems() {
  try {
    const items = await base44.entities.InventoryItem.list("name", 500);
    const seen = new Map();
    const duplicates = [];

    (items || []).forEach((item) => {
      const key = normalize(item.name);
      if (!key) return;
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.set(key, item.id);
      }
    });

    await Promise.all(duplicates.map((item) => base44.entities.InventoryItem.delete(item.id)));
    return duplicates.length;
  } catch {
    return 0;
  }
}

export async function cleanupDuplicateMenuItems() {
  try {
    const items = await base44.entities.MenuItem.list("name", 500);
    const seen = new Map();
    const duplicates = [];

    (items || []).forEach((item) => {
      const key = normalize(item.name);
      if (!key) return;
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.set(key, item.id);
      }
    });

    await Promise.all(duplicates.map((item) => base44.entities.MenuItem.delete(item.id)));
    return duplicates.length;
  } catch {
    return 0;
  }
}

export async function cleanupDuplicateOrders() {
  try {
    const orders = await base44.entities.Order.list("-created_date", 1000);
    const seen = new Map();
    const duplicates = [];

    (orders || []).forEach((order) => {
      const key = normalize(order.order_number || `${order.type || "order"}-${order.created_date || ""}-${order.total || ""}-${order.customer_name || ""}`);
      if (!key) return;
      if (seen.has(key)) {
        duplicates.push(order);
      } else {
        seen.set(key, order.id);
      }
    });

    await Promise.all(duplicates.map((order) => base44.entities.Order.delete(order.id)));
    return duplicates.length;
  } catch {
    return 0;
  }
}

export async function findDuplicateInventoryItem(name, currentId = null) {
  try {
    const items = await base44.entities.InventoryItem.list("name", 500);
    const key = normalize(name);
    return (items || []).find((item) => item.id !== currentId && normalize(item.name) === key);
  } catch {
    return null;
  }
}

export async function findDuplicateMenuItem(name, currentId = null) {
  try {
    const items = await base44.entities.MenuItem.list("name", 500);
    const key = normalize(name);
    return (items || []).find((item) => item.id !== currentId && normalize(item.name) === key);
  } catch {
    return null;
  }
}

export async function findDuplicateOrder(orderNumber, currentId = null) {
  try {
    const orders = await base44.entities.Order.list("-created_date", 1000);
    const key = normalize(orderNumber);
    return (orders || []).find((order) => order.id !== currentId && normalize(order.order_number) === key);
  } catch {
    return null;
  }
}
