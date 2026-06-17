"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Theme } from "@/types";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({
  children,
  initial = "dark",
}: {
  children: React.ReactNode;
  initial?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initial);

  // Sync React state with the persisted choice after mount. The first client
  // render intentionally matches the server (SSR-safe); we adopt localStorage
  // once mounted. Theme only drives CSS variables, so no markup mismatch.
  useEffect(() => {
    const saved = (localStorage.getItem("fl-theme") as Theme) || initial;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, [initial]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("fl-theme", t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
