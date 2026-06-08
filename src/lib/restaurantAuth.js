import { base44 } from "@/api/base44Client";

const SESSION_KEY = "restaurant_session";

export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
};

export const setSession = (user) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));

export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const isLoggedIn = () => !!getSession();

export const loginUser = async (username, password, franchise) => {
  const users = await base44.entities.AppUser.list();
  const match = users.find(
    (u) =>
      u.username?.toLowerCase() === username.toLowerCase() &&
      u.password === password
  );
  if (!match) throw new Error("Invalid username or password.");
  if (match.status !== "active") throw new Error("Account is inactive. Contact admin.");
  await base44.entities.AppUser.update(match.id, { last_login: new Date().toISOString() }).catch(() => {});
  setSession(match);
  return match;
};

export const logAudit = async (action, details, type = "system") => {
  const session = getSession();
  await base44.entities.AuditLog.create({
    action,
    details,
    type,
    user: session?.username || "system",
    role: session?.role || "",
    branch: session?.branch_id || "",
    timestamp: new Date().toISOString(),
  }).catch(() => {});
};