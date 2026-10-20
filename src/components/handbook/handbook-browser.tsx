"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { HANDBOOK_CATEGORIES, fold, searchText, type HandbookEntry } from "@/lib/handbook/types";

export type HandbookCard = Omit<HandbookEntry, "body">;

// Danh sách sổ tay: tìm không dấu ("nang luc" ra Cpk), lọc theo nhóm, phím "/" để tìm nhanh.
export function HandbookBrowser({ entries }: { entries: HandbookCard[] }) {
  const { lang } = useLanguage();
  const t = (vi: string, en: string) => (lang === "en" ? en : vi);
  const L = (x: { vi: string; en: string }) => (lang === "en" && x.en) || x.vi;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const index = useMemo(() => entries.map((e) => ({ e, text: searchText({ ...e, body: { vi: "", en: "" } }) })), [entries]);
  const words = fold(q).split(/\s+/).filter(Boolean);
  const hits = index.filter(({ text }) => words.every((w) => text.includes(w))).map((x) => x.e);
  const matched = hits.filter((e) => cat === "all" || e.category === cat);
  const groups = HANDBOOK_CATEGORIES.map((c) => ({ ...c, items: matched.filter((e) => e.category === c.id) })).filter((g) => g.items.length);
  const chip = (active: boolean) => `chip !px-3 !py-1 ${active ? "!border-brand-500 bg-brand-600 font-semibold text-white" : ""}`;

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <div className="relative">
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input !py-3 pl-10 text-base"
            placeholder={t("Tìm tham số: cpk, yield, area ratio, TAL, MSL…  (phím /)", "Search: cpk, yield, area ratio, TAL, MSL…  (press /)")}
            aria-label={t("Tìm trong sổ tay", "Search handbook")}
          />
          <span className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden>
            🔎
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Nhóm", "Category")}>
          <button type="button" onClick={() => setCat("all")} aria-pressed={cat === "all"} className={chip(cat === "all")}>
            {t("Tất cả", "All")} ({hits.length})
          </button>
          {HANDBOOK_CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={chip(cat === c.id)}>
              {c.icon} {lang === "en" ? c.en : c.vi} ({hits.filter((e) => e.category === c.id).length})
            </button>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.id} className="space-y-3" aria-labelledby={`cat-${g.id}`}>
          <h2 id={`cat-${g.id}`} className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden>{g.icon}</span> {lang === "en" ? g.en : g.vi}
            <span className="muted text-sm font-normal">· {g.items.length}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((e) => (
              <Link key={e.slug} href={`/tai-lieu-ky-thuat/so-tay/${e.slug}`} className="card group flex flex-col gap-2 !p-4 hover:border-brand-400">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-sm font-bold text-brand-700 dark:bg-slate-800 dark:text-brand-200">{e.symbol || "•"}</span>
                  <span className="flex gap-1 text-xs">
                    {e.calculator && (
                      <span className="chip" title={t("Có máy tính", "Has calculator")}>
                        🧮
                      </span>
                    )}
                    {e.status === "draft" && <span className="chip">{t("Nháp", "Draft")}</span>}
                  </span>
                </div>
                <h3 className="font-semibold leading-snug group-hover:text-brand-600">{L(e.title)}</h3>
                <p className="muted line-clamp-3 text-sm">{L(e.summary)}</p>
                {e.formula && (
                  <p className="mt-auto truncate rounded-md px-2 py-1 font-mono text-xs" style={{ background: "var(--viz-1-wash)" }} title={e.formula}>
                    {e.formula.split("\n")[0]}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {!groups.length && (
        <p className="card muted text-sm">
          {t("Không tìm thấy mục nào cho", "Nothing found for")} “{q}”.
        </p>
      )}
    </div>
  );
}
