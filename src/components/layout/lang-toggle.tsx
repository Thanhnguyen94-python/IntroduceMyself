"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "vi" ? "en" : "vi")}
      className="h-9 rounded-xl border px-2.5 text-xs font-semibold transition hover:bg-brand-50 dark:hover:bg-slate-800"
      style={{ borderColor: "var(--border)" }}
      aria-label="Switch language"
    >
      {lang === "vi" ? "VI" : "EN"}
    </button>
  );
}
