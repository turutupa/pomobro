"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme | null>(null);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("pomobro:theme") as Theme | null;
    setThemeState(stored && ["light", "dark", "system"].includes(stored) ? stored : "system");
  }, []);

  useEffect(() => {
    if (theme === null) return;
    const root = document.documentElement;
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    root.classList.toggle("dark", resolvedTheme === "dark");
    setResolved(resolvedTheme);

    // Sync theme-color meta for mobile browser chrome (address bar, status bar)
    const color = resolvedTheme === "dark" ? "#0c0c0e" : "#f8fafc";
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const m = document.createElement("meta");
    m.name = "theme-color";
    m.content = color;
    document.head.appendChild(m);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const resolvedTheme = mq.matches ? "dark" : "light";
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
        setResolved(resolvedTheme);
        const color = resolvedTheme === "dark" ? "#0c0c0e" : "#f8fafc";
        document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
        const m = document.createElement("meta");
        m.name = "theme-color";
        m.content = color;
        document.head.appendChild(m);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("pomobro:theme", t);
    }
  };

  useEffect(() => {
    if (theme === null && typeof document !== "undefined") {
      setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
  }, [theme]);

  const effectiveTheme = theme ?? "system";

  return (
    <ThemeContext.Provider
      value={{ theme: effectiveTheme, setTheme, resolved }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
