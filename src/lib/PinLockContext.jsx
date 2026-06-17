import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getSession } from "@/lib/restaurantAuth";

const IDLE_MS = 5 * 60 * 1000;
const PinLockContext = createContext(null);

function getCurrentUserPin() {
  const session = getSession();
  if (!session?.username) return null;
  const pin = localStorage.getItem(`app_pin_${session.username}`);
  // Strictly validate — must be exactly 4 digits, never empty string
  return (pin && /^\d{4}$/.test(pin)) ? pin : null;
}

export function PinLockProvider({ children }) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedPath, setLockedPath] = useState(null);
  const idleTimer = useRef(null);

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    // Only start idle timer if user actually has a valid PIN set
    if (!getCurrentUserPin()) return;
    idleTimer.current = setTimeout(() => {
      setLockedPath(window.location.pathname);
      setIsLocked(true);
    }, IDLE_MS);
  }, []);

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
      setLockedPath(window.location.pathname);
      setIsLocked(true);
    }
  };

  const unlock = () => {
    setIsLocked(false);
    resetIdle();
  };

  const verifyPin = (entered) => {
    const stored = getCurrentUserPin();
    // Fail closed — if no valid PIN is stored, never unlock via PIN entry
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