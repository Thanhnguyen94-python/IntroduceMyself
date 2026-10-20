"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { REPORT_TEMPLATES } from "@/lib/smt/catalog";
import { isPageEnabled, type SiteVisibilityConfig } from "@/lib/site-visibility-types";

// Kệ "Bộ mẫu báo cáo SMT" trên trang /tai-lieu-ky-thuat: xem nhanh, tải Excel trống, in PDF.
// Tự ẩn khi công tắc "Mẫu báo cáo SMT" (key "smt") đang tắt.
export function SmtTemplateShelf() {
  const { lang } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const t = (vi: string, en: string) => (lang === "en" ? en : vi);

  useEffect(() => {
    let mounted = true;
    fetch("/api/site/visibility", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: SiteVisibilityConfig | null) => mounted && setEnabled(payload ? isPageEnabled(payload, "smt") : false))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">SMT Engineering Report &amp; Toolkit</p>
          <h2 className="text-xl font-bold">{t("Bộ mẫu báo cáo SMT", "SMT report templates")}</h2>
          <p className="muted text-sm">{t("Xem báo cáo mẫu, tải Excel trống (có sẵn công thức) hoặc in PDF.", "View examples, download blank Excel (formulas included) or print to PDF.")}</p>
        </div>
        <Link href="/tai-lieu-ky-thuat/smt-reports" className="btn-primary">
          {t("Mở bộ công cụ", "Open toolkit")} →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {REPORT_TEMPLATES.map((tpl) => (
          <li key={tpl.slug} className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <Link href={`/tai-lieu-ky-thuat/smt-reports/${tpl.slug}`} className="min-w-0 hover:text-brand-600">
              <span className="text-xl">{tpl.icon}</span>
              <span className="muted block text-[11px] font-semibold uppercase tracking-wide">{tpl.code}</span>
              <span className="block text-sm font-semibold leading-snug">{tpl.title[lang] || tpl.title.vi}</span>
            </Link>
            <div className="mt-auto flex gap-3 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <a href={`/api/smt/templates/${tpl.slug}`} download>
                ⬇ Excel
              </a>
              <a href={`/tai-lieu-ky-thuat/smt-reports/${tpl.slug}?${tpl.slug === "8d" ? "blank=1&" : ""}print=1`} target="_blank" rel="noreferrer">
                🖨 PDF
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
