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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const project = getProjectsData().items.find((item) => item.slug === params.slug);

  const showPrevImage = () => {
    if (!project || project.gallery.length === 0) {
      return;
    }

    setViewerIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + project.gallery.length) % project.gallery.length;
    });
    setZoom(1);
  };

  const showNextImage = () => {
    if (!project || project.gallery.length === 0) {
      return;
    }

    setViewerIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % project.gallery.length;
    });
    setZoom(1);
  };

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerIndex(null);
        setZoom(1);
      }

      if (viewerIndex !== null && event.key === "ArrowLeft") {
        showPrevImage();
      }

      if (viewerIndex !== null && event.key === "ArrowRight") {
        showNextImage();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [viewerIndex, project]);

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
          {project.gallery.map((img: string, index: number) => (
            <figure
              key={img}
              className="overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/60"
            >
              {brokenImages[img] ? (
                <div className="flex h-36 items-center justify-center px-3 text-center text-xs" style={{ color: "var(--muted)" }}>
                  {lang === "vi" ? "Không tìm thấy ảnh" : "Image not found"}
                </div>
              ) : (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => {
                    setViewerIndex(index);
                    setZoom(1);
                  }}
                >
                  <img
                    src={img}
                    alt={`${pickText(project.title, lang)} gallery`}
                    className="h-40 w-full object-cover transition duration-300 hover:scale-[1.02]"
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

      {viewerIndex !== null && project.gallery[viewerIndex] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => {
            setViewerIndex(null);
            setZoom(1);
          }}
          onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchStartX === null) {
              return;
            }

            const touchEndX = e.changedTouches[0]?.clientX ?? touchStartX;
            const deltaX = touchEndX - touchStartX;
            const swipeThreshold = 50;

            if (deltaX > swipeThreshold) {
              showPrevImage();
            } else if (deltaX < -swipeThreshold) {
              showNextImage();
            }

            setTouchStartX(null);
          }}
        >
          <div className="max-h-full w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900/90 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-end gap-2 px-3 pt-3">
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={showPrevImage}
              >
                {lang === "vi" ? "Trước" : "Prev"}
              </button>
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-sm text-white"
                onClick={showNextImage}
              >
                {lang === "vi" ? "Tiếp" : "Next"}
              </button>
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
                  setViewerIndex(null);
                  setZoom(1);
                }}
              >
                {lang === "vi" ? "Đóng" : "Close"}
              </button>
            </div>

            <div className="max-h-[78vh] overflow-auto bg-black/30 p-2">
              <img
                src={project.gallery[viewerIndex]}
                alt={`${pickText(project.title, lang)} zoom`}
                className="mx-auto max-w-full origin-center"
                style={{ transform: `scale(${zoom})`, transition: "transform 150ms ease" }}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-200">
              <p className="truncate" title={project.gallery[viewerIndex]}>{project.gallery[viewerIndex]}</p>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs">
                {viewerIndex + 1}/{project.gallery.length}
              </span>
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
