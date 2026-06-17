import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getSession } from "@/lib/restaurantAuth";

const IDLE_MS = 5 * 60 * 1000;
const LOCK_KEY = "app_pin_lock_state"; // persisted across refresh
const PinLockContext = createContext(null);

function getCurrentUserPin() {
  const session = getSession();
  if (!session?.username) return null;
  const pin = localStorage.getItem(`app_pin_${session.username}`);
  return (pin && /^\d{4}$/.test(pin)) ? pin : null;
}

// ── Persisted lock state helpers ───────────────────────────────────────────
function readPersistedLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.locked === true) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writePersistedLock(locked, path) {
  try {
    if (locked) {
      localStorage.setItem(LOCK_KEY, JSON.stringify({ locked: true, path: path || window.location.pathname }));
    } else {
      localStorage.removeItem(LOCK_KEY);
    }
  } catch {}
}

export function PinLockProvider({ children }) {
  // Initialize synchronously from localStorage — so a refresh while locked
  // stays locked on the very first render, instead of flashing unlocked.
  const [isLocked, setIsLocked] = useState(() => {
    const persisted = readPersistedLock();
    // Only honor a persisted lock if the user still has a valid PIN configured.
    // (Covers edge case: PIN removed by admin while app was locked.)
    return !!(persisted && getCurrentUserPin());
  });
  const [lockedPath, setLockedPath] = useState(() => {
    const persisted = readPersistedLock();
    return persisted?.path || null;
  });
  const idleTimer = useRef(null);

  // If we booted locked but the user has no valid PIN anymore, clear it.
  useEffect(() => {
    if (isLocked && !getCurrentUserPin()) {
      setIsLocked(false);
      setLockedPath(null);
      writePersistedLock(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (!getCurrentUserPin()) return;
    // Don't reset/restart the idle timer while already locked —
    // otherwise background events could keep pushing the timer out.
    if (isLocked) return;
    idleTimer.current = setTimeout(() => {
      const path = window.location.pathname;
      setLockedPath(path);
      setIsLocked(true);
      writePersistedLock(true, path);
    }, IDLE_MS);
  }, [isLocked]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  const hasPin = () => !!getCurrentUserPin();

  const lock = () => {
    if (getCurrentUserPin()) {
      const path = window.location.pathname;
      setLockedPath(path);
      setIsLocked(true);
      writePersistedLock(true, path);
    }
  };

  const unlock = () => {
    setIsLocked(false);
    setLockedPath(null);
    writePersistedLock(false);
    resetIdle();
  };

  const verifyPin = (entered) => {
    const stored = getCurrentUserPin();
    if (!stored) return false;
    if (!entered || entered.length !== 4) return false;
    return entered === stored;
  };

  return (
    <PinLockContext.Provider value={{ isLocked, lockedPath, hasPin, lock, unlock, verifyPin }}>
      {children}
    </PinLockContext.Provider>
  );
}

export function usePinLock() {
  return useContext(PinLockContext);
}
