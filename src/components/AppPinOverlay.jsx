import { useState, useEffect } from "react";
import { Delete } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePinLock } from "@/lib/PinLockContext";
import { logAudit } from "@/lib/auditLog";

export default function AppPinOverlay() {
  const { unlock, verifyPin, lockedPath } = usePinLock();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const logoUrl = localStorage.getItem("branding_logo") || "";

  useEffect(() => {
    if (pin.length !== 4) return;
    if (verifyPin(pin)) {
      setError("");
      logAudit("App unlocked via PIN", "App PIN unlock", "auth");
      unlock();
      if (lockedPath && lockedPath !== window.location.pathname) {
        navigate(lockedPath);
      }
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPin("");
      if (next >= 5) {
        setBlocked(true);
        setError("Too many failed attempts. Contact admin.");
        logAudit("App PIN — 5 failed attempts", "5 failed PIN attempts", "auth");
      } else {
        setError(`Wrong PIN. ${5 - next} attempt(s) remaining.`);
      }
    }
  }, [pin]);

  const handleKey = (k) => {
    if (blocked || pin.length >= 4) return;
    setPin(p => p + k);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-3 mb-2">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-2xl" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-orange">
            <span className="text-2xl font-black text-primary">CH</span>
          </div>
        )}
        <h2 className="text-xl font-bold text-foreground">App Locked</h2>
        <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to continue</p>
      </div>

      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              pin.length > i ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

      <div className="grid grid-cols-3 gap-3 mt-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
          <button
            key={i}
            disabled={blocked || k === ""}
            onClick={() =>
              k === "⌫"
                ? setPin(p => p.slice(0, -1))
                : k !== "" && handleKey(String(k))
            }
            className={`w-16 h-16 rounded-2xl text-lg font-semibold transition-all duration-150 ${
              k === ""
                ? "invisible"
                : k === "⌫"
                ? "glass border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10"
                : "glass border border-white/10 text-foreground hover:bg-primary/20 hover:border-primary/40 active:scale-95"
            } ${blocked ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {k === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}