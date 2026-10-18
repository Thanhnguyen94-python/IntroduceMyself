"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // resolvedTheme xử lý đúng trường hợp theme = "system".
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid h-9 w-9 place-items-center rounded-xl border text-sm transition hover:scale-105 hover:bg-brand-50 dark:hover:bg-slate-800"
      style={{ borderColor: "var(--border)" }}
      aria-label="Toggle color theme"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span suppressHydrationWarning>{mounted ? (isDark ? "☀️" : "🌙") : "◐"}</span>
    </button>
  );
}
