// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef();

  const load = async () => {
    const all = await base44.entities.Notification.list("-created_date", 50);
    setNotifications(all);
  };

  useEffect(() => {
    load();
    // Poll every 60s so new alerts appear without refresh
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    setNotifications([]);
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
  };

  const iconFor = (n) => {
    if (n.alert_type === "critical") return "🔴";
    if (n.alert_type === "low") return "🟡";
    if (n.type === "payment") return "🟠";
    return "🔔";
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 z-50 rounded-2xl border border-white/10 bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  ✔ Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  {/* Unread dot */}
                  <div className="mt-1 shrink-0">
                    {!n.read
                      ? <span className="w-2 h-2 rounded-full bg-primary block mt-0.5" />
                      : <span className="w-2 h-2 block" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                        {iconFor(n)} {n.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.created_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}