"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { getProjectsData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const { lang } = useLanguage();
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const project = getProjectsData().items.find((item) => item.slug === params.slug);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerImage(null);
        setZoom(1);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  if (!project) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link href="/du-an" className="text-sm text-brand-600 dark:text-brand-300">← {lang === "vi" ? "Quay lại danh sách dự án" : "Back to projects"}</Link>
      <h1 className="text-2xl font-bold">{pickText(project.title, lang)}</h1>
      <p style={{ color: "var(--muted)" }}>{pickText(project.summary, lang)}</p>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Mục tiêu dự án" : "Project objective"}</h2>
        <p className="whitespace-pre-line text-sm" style={{ color: "var(--muted)" }}>
          {pickText(project.objective, lang) || (lang === "vi" ? "Chưa cập nhật" : "Not updated")}
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Mô tả dự án" : "Project description"}</h2>
        <p className="whitespace-pre-line text-sm leading-6" style={{ color: "var(--muted)" }}>
          {pickText(project.description, lang) || (lang === "vi" ? "Chưa cập nhật" : "Not updated")}
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Thiết bị" : "Equipments"}</h2>
        <div className="flex flex-wrap gap-2">
          {project.equipmentTags.map((tag: string) => (
            <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">{tag}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "File đính kèm" : "Attachments"}</h2>
        {project.attachments.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {project.attachments.map((file) => (
              <li key={`${file.fileUrl}-${pickText(file.label, lang)}`}>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 underline underline-offset-2 dark:text-brand-300"
                >
                  {pickText(file.label, lang)}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {lang === "vi" ? "Chưa có file đính kèm" : "No attachment files yet"}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hình ảnh" : "Image"}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {project.gallery.map((img: string) => (
            <figure key={img} className="overflow-hidden rounded border border-dashed" style={{ borderColor: "var(--border)" }}>
              {brokenImages[img] ? (
                <div className="flex h-36 items-center justify-center px-3 text-center text-xs" style={{ color: "var(--muted)" }}>
                  {lang === "vi" ? "Không tìm thấy ảnh" : "Image not found"}
                </div>
              ) : (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => {
                    setViewerImage(img);
                    setZoom(1);
                  }}
                >
                  <img
                    src={img}
                    alt={`${pickText(project.title, lang)} gallery`}
                    className="h-36 w-full object-cover"
                    loading="lazy"
                    onError={() => setBrokenImages((prev) => ({ ...prev, [img]: true }))}
                  />
                </button>
              )}
              <figcaption className="truncate px-2 py-1 text-center text-[11px]" style={{ color: "var(--muted)" }} title={img}>
                {img}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {viewerImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setViewerImage(null);
            setZoom(1);
          }}
        >
          <div className="max-h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              >
                -
              </button>
              <span className="min-w-14 text-center text-sm text-white">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
              >
                +
              </button>
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={() => setZoom(1)}
              >
                {lang === "vi" ? "Mặc định" : "Reset"}
              </button>
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={() => {
                  setViewerImage(null);
                  setZoom(1);
                }}
              >
                {lang === "vi" ? "Đóng" : "Close"}
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto rounded bg-black/30 p-2">
              <img
                src={viewerImage}
                alt={`${pickText(project.title, lang)} zoom`}
                className="mx-auto max-w-full origin-center"
                style={{ transform: `scale(${zoom})`, transition: "transform 150ms ease" }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2 className="mb-3 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Bài học & vấn đề khác" : "Lessons learned & other"}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {pickList(project.lessonsLearned, lang).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
