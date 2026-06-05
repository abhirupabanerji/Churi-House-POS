/**
 * App-wide dark/light mode context.
 * Reads from localStorage on startup, syncs class on <html>.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);
const KEY = "churi_dark_mode";

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(KEY);
    // default dark
    return stored === null ? true : stored === "true";
  });

  const applyMode = useCallback((dark) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, []);

  useEffect(() => {
    applyMode(isDark);
  }, [isDark, applyMode]);

  const toggle = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem(KEY, String(next));
      applyMode(next);
      return next;
    });
  };

  const setDark = (dark) => {
    setIsDark(dark);
    localStorage.setItem(KEY, String(dark));
    applyMode(dark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}