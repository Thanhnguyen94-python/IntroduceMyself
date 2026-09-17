"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg border px-2 py-1 text-xs"
      style={{ borderColor: "var(--border)" }}
      aria-label="Toggle color theme"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
