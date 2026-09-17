"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getProjectsData } from "@/lib/content/loaders";
import { pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

const filters = ["all", "3d-jig", "app-software", "smt-improvement"] as const;
const filterLabels = {
  vi: {
    all: "Tất cả",
    "3d-jig": "Bản vẽ 3D/Jig",
    "app-software": "Ứng dụng/Phần mềm",
    "smt-improvement": "Cải tiến SMT"
  },
  en: {
    all: "All",
    "3d-jig": "3D/Jig Drawings",
    "app-software": "Apps/Software",
    "smt-improvement": "SMT Improvements"
  }
} as const;

export default function DuAnPage() {
  const { lang } = useLanguage();
  const data = getProjectsData();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");

  const visible = useMemo(() => {
    if (activeFilter === "all") return data.items;
    return data.items.filter((item) => item.category === activeFilter);
  }, [activeFilter, data.items]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Dự Án & Cải Tiến" : "Projects & Improvements"}</h1>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-full px-3 py-1 text-sm ${activeFilter === f ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-brand-200"}`}
          >
            {filterLabels[lang][f]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <article key={item.id} className="card">
            <h2 className="text-lg font-semibold">{pickText(item.title, lang)}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{pickText(item.summary, lang)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.equipmentTags.map((tag) => (
                <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">{tag}</span>
              ))}
            </div>
            <Link href={`/du-an/${item.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600 dark:text-brand-300">
              {lang === "vi" ? "Xem chi tiết" : "View details"} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
