"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getProjectsData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const { lang } = useLanguage();
  const project = getProjectsData().items.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link href="/du-an" className="text-sm text-brand-600 dark:text-brand-300">← {lang === "vi" ? "Quay lại danh sách dự án" : "Back to projects"}</Link>
      <h1 className="text-2xl font-bold">{pickText(project.title, lang)}</h1>
      <p style={{ color: "var(--muted)" }}>{pickText(project.summary, lang)}</p>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Tag thiết bị" : "Equipment tags"}</h2>
        <div className="flex flex-wrap gap-2">
          {project.equipmentTags.map((tag: string) => (
            <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">{tag}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">Gallery</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {project.gallery.map((img: string) => (
            <div key={img} className="rounded border border-dashed p-5 text-center text-xs" style={{ borderColor: "var(--border)" }}>
              {img}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Bài học rút ra" : "Lessons learned"}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {pickList(project.lessonsLearned, lang).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
