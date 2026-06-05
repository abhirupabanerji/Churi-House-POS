import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AdBanner from "./AdBanner";
import NotificationBell from "./NotificationBell";
import { Lock, Sun, Moon } from "lucide-react";
import { usePinLock } from "@/lib/PinLockContext";
import { useTheme } from "@/lib/ThemeContext";

export default function Layout() {
  const { lock, hasPin } = usePinLock();
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-60 min-h-screen flex flex-col">
        <AdBanner />
        <header className="sticky top-0 z-40 flex items-center justify-end gap-2 px-6 h-12 border-b border-white/5 bg-background/80 backdrop-blur-sm shrink-0">
          <button
            onClick={toggle}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all"
          >
            {isDark ? <Sun className="w-4 h-4 text-muted-foreground hover:text-primary" /> : <Moon className="w-4 h-4 text-muted-foreground hover:text-primary" />}
          </button>
          {hasPin && (
            <button
              onClick={lock}
              title="Lock App"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all"
            >
              <Lock className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </button>
          )}
          <NotificationBell />
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}