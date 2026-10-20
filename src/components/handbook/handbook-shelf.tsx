"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { HANDBOOK_CATEGORIES } from "@/lib/handbook/types";
import { isPageEnabled, type SiteVisibilityConfig } from "@/lib/site-visibility-types";

// Thẻ "Sổ tay SMT" trên trang /tai-lieu-ky-thuat. Tự ẩn khi công tắc "Sổ tay SMT" (key "handbook") tắt.
const POPULAR = [
  ["cp-cpk", "Cpk"],
  ["fpy", "FPY"],
  ["dpmo", "DPMO"],
  ["oee", "OEE"],
  ["area-ratio", "Area ratio"],
  ["tal", "TAL"],
  ["msl", "MSL"],
  ["chip-solder-joint", "IPC-A-610"]
] as const;

export function HandbookShelf() {
  const { lang } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const t = (vi: string, en: string) => (lang === "en" ? en : vi);

  useEffect(() => {
    let mounted = true;
    fetch("/api/site/visibility", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: SiteVisibilityConfig | null) => mounted && setEnabled(payload ? isPageEnabled(payload, "handbook") : false))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <section className="card grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-center">
      <div className="space-y-2">
        <p className="eyebrow">SMT Field Handbook</p>
        <h2 className="text-xl font-bold">📘 {t("Sổ tay tra cứu SMT", "SMT field handbook")}</h2>
        <p className="muted text-sm">
          {t(
            "Ý nghĩa, công thức, ngưỡng tham khảo và lưu ý thực tế của các tham số SMT – kèm máy tính Cpk, Area ratio, OEE, MSL…",
            "Meaning, formulas, reference limits and field notes for SMT parameters — with Cpk, area ratio, OEE, MSL calculators."
          )}
        </p>
        <p className="muted text-xs">{HANDBOOK_CATEGORIES.map((c) => `${c.icon} ${lang === "en" ? c.en : c.vi}`).join(" · ")}</p>
        <Link href="/tai-lieu-ky-thuat/so-tay" className="btn-primary mt-1">
          {t("Mở sổ tay", "Open handbook")} →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {POPULAR.map(([slug, label]) => (
          <Link key={slug} href={`/tai-lieu-ky-thuat/so-tay/${slug}`} className="rounded-lg bg-brand-50 px-3 py-2 font-mono text-sm font-bold text-brand-700 transition hover:bg-brand-100 dark:bg-slate-800 dark:text-brand-200">
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
