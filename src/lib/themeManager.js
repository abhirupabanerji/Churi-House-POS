const THEME_MAP = {
  Orange: { primary: "25 95% 53%", accent: "25 95% 53%", ring: "25 95% 53%", chart1: "25 95% 53%" },
  Blue:   { primary: "221 83% 53%", accent: "221 83% 53%", ring: "221 83% 53%", chart1: "221 83% 53%" },
  Green:  { primary: "142 71% 45%", accent: "142 71% 45%", ring: "142 71% 45%", chart1: "142 71% 45%" },
  Purple: { primary: "271 91% 65%", accent: "271 91% 65%", ring: "271 91% 65%", chart1: "271 91% 65%" },
  Red:    { primary: "0 84% 60%",   accent: "0 84% 60%",   ring: "0 84% 60%",   chart1: "0 84% 60%" },
  Teal:   { primary: "172 66% 50%", accent: "172 66% 50%", ring: "172 66% 50%", chart1: "172 66% 50%" },
};

export function applyTheme(settings) {
  const root = document.documentElement;
  const colors = THEME_MAP[settings.theme_color] || THEME_MAP.Orange;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--ring", colors.ring);
  root.style.setProperty("--chart-1", colors.chart1);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-ring", colors.ring);

  // Apply dark/light mode
  if (settings.dark_mode === false) {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }

  if (settings.favicon_url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = settings.favicon_url;
  }
}

export function applyThemeFromDB() {
  try {
    const cached = localStorage.getItem("churi_settings");
    if (cached) {
      applyTheme(JSON.parse(cached));
    } else {
      // Default: dark mode
      document.documentElement.classList.add("dark");
    }
  } catch {
    document.documentElement.classList.add("dark");
  }
}