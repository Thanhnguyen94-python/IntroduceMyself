"use client";

import { useState } from "react";
import { getExperienceData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function HanhTrinhPage() {
  const data = getExperienceData();
  const { lang } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = data.items.find((i) => i.id === activeId);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hành Trình Nghề Nghiệp" : "Career Journey"}</h1>
      <div className="grid gap-4">
        {data.items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveId(item.id)}
            className="card text-left transition hover:shadow-md"
          >
            <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
            <h2 className="text-lg font-semibold">{item.company}</h2>
            <p className="text-sm">{pickText(item.role, lang)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.equipmentTags.map((tag) => (
                <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveId(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{active.company}</h3>
                <p>{pickText(active.role, lang)}</p>
              </div>
              <button className="rounded border px-3 py-1 text-sm" onClick={() => setActiveId(null)}>Esc</button>
            </div>

            <h4 className="mb-2 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Nhiệm vụ chính" : "Responsibilities"}</h4>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
              {pickList(active.responsibilities, lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4 className="mb-2 font-semibold text-brand-600 dark:text-brand-300">Sai lầm lớn mắc phải trong quá trình làm việc và RCA(Root Cause Analysis)</h4>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
              {pickList(active.problemRootCauseAction, lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4 className="mb-2 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hoạt động đào tạo" : "Training activities"}</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {pickList(active.trainingActivities, lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4 className="mb-2 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Thành tích" : "Achievements"}</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {pickList(active.achievements, lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4 className="mb-2 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Cải tiến" : "Improvements"}</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {pickList(active.improvements, lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
