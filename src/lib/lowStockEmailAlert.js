import { base44 } from "@/api/base44Client";

export async function sendLowStockAlerts(items) {
  try {
    // Get SMTP settings
    const settingsRecords = await base44.entities.BranchSettings.list().catch(() => []);
    const s = settingsRecords[0];
    if (!s || !s.smtp_host || !s.from_email) return; // No SMTP configured
    if (!s.email_low_stock) return; // Feature disabled

    // Get all users — find super_admin and branch_manager
    const users = await base44.entities.User.list("full_name", 100).catch(() => []);
    const recipients = users.filter(u =>
      ["super_admin", "admin", "branch_manager"].includes(u.role) && u.email
    );
    if (!recipients.length) return;

    const criticalItems = items.filter(i => i.stock <= 0);
    const lowItems = items.filter(i => i.stock > 0 && i.stock <= i.min_level);
    if (!criticalItems.length && !lowItems.length) return;

    const subject = `⚠️ Low Stock Alert — ${criticalItems.length} critical, ${lowItems.length} low`;
    const body = `
      <h2>Inventory Alert — Churi House POS</h2>
      ${criticalItems.length > 0 ? `
        <h3 style="color:#dc2626">🔴 Out of Stock (${criticalItems.length} items)</h3>
        <ul>${criticalItems.map(i => `<li><b>${i.name}</b> — ${i.stock} ${i.unit} remaining (min: ${i.min_level})</li>`).join("")}</ul>
      ` : ""}
      ${lowItems.length > 0 ? `
        <h3 style="color:#d97706">🟡 Low Stock (${lowItems.length} items)</h3>
        <ul>${lowItems.map(i => `<li><b>${i.name}</b> — ${i.stock} ${i.unit} remaining (min: ${i.min_level})</li>`).join("")}</ul>
      ` : ""}
      <p style="color:#6b7280;font-size:12px">Sent from Churi House POS System</p>
    `;

    for (const user of recipients) {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject,
        body,
        smtp_host: s.smtp_host,
        smtp_port: s.smtp_port || "587",
        smtp_user: s.smtp_user,
        smtp_pass: s.smtp_pass,
        from_email: s.from_email,
        from_name: s.from_name || "Churi House POS",
      }).catch(err => console.error(`Failed to send to ${user.email}:`, err));
    }
    console.log(`Low stock alert sent to ${recipients.length} recipients`);
  } catch (err) {
    console.error("Low stock alert error:", err);
  }
}