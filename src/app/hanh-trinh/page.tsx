"use client";

import { useEffect, useState } from "react";
import { getExperienceData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function HanhTrinhPage() {
  const data = getExperienceData();
  const { lang } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const active = data.items.find((i) => i.id === activeId);

  useEffect(() => {
    if (!active || viewerIndex === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerIndex(null);
        return;
      }

      if (active.images.length === 0) {
        return;
      }

      if (event.key === "ArrowRight") {
        setViewerIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % active.images.length;
        });
      }

      if (event.key === "ArrowLeft") {
        setViewerIndex((prev) => {
          if (prev === null) return 0;
          return (prev - 1 + active.images.length) % active.images.length;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, viewerIndex]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hành Trình Nghề Nghiệp" : "Career Journey"}</h1>
      <div className="grid gap-4">
        {data.items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveId(item.id);
              setViewerIndex(null);
            }}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setViewerIndex(null);
            setActiveId(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{active.company}</h3>
                <p>{pickText(active.role, lang)}</p>
              </div>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => {
                  setViewerIndex(null);
                  setActiveId(null);
                }}
              >
                Esc
              </button>
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

            <h4 className="mb-2 mt-4 font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hình ảnh" : "Images"}</h4>
            {active.images.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {active.images.map((image, index) => {
                  const imageKey = `${active.id}-${image.src}`;
                  return (
                    <figure
                      key={imageKey}
                      className="overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/60"
                    >
                      {brokenImages[imageKey] ? (
                        <div className="flex h-40 items-center justify-center px-3 text-center text-xs" style={{ color: "var(--muted)" }}>
                          {lang === "vi" ? "Không tìm thấy ảnh" : "Image not found"}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="block w-full"
                          onClick={() => setViewerIndex(index)}
                        >
                          <img
                            src={image.src}
                            alt={pickText(image.description, lang) || active.company}
                            className="h-44 w-full object-cover transition duration-300 hover:scale-[1.02]"
                            loading="lazy"
                            onError={() => setBrokenImages((prev) => ({ ...prev, [imageKey]: true }))}
                          />
                        </button>
                      )}
                      <figcaption className="px-3 py-2 text-sm" style={{ color: "var(--muted)" }}>
                        {pickText(image.description, lang) || (lang === "vi" ? "Chưa có mô tả" : "No description")}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {lang === "vi" ? "Chưa có hình ảnh" : "No images yet"}
              </p>
            )}

            {viewerIndex !== null && active.images[viewerIndex] ? (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex(null);
                }}
              >
                <div
                  className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900/90 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                    onClick={() => setViewerIndex((prev) => {
                      if (prev === null) return 0;
                      return (prev - 1 + active.images.length) % active.images.length;
                    })}
                  >
                    {lang === "vi" ? "Trước" : "Prev"}
                  </button>

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                    onClick={() => setViewerIndex((prev) => {
                      if (prev === null) return 0;
                      return (prev + 1) % active.images.length;
                    })}
                  >
                    {lang === "vi" ? "Tiếp" : "Next"}
                  </button>

                  <button
                    type="button"
                    className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 transition hover:bg-white"
                    onClick={() => setViewerIndex(null)}
                  >
                    {lang === "vi" ? "Đóng" : "Close"}
                  </button>

                  <img
                    src={active.images[viewerIndex].src}
                    alt={pickText(active.images[viewerIndex].description, lang) || active.company}
                    className="max-h-[78vh] w-full object-contain bg-slate-950/70"
                  />

                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-200">
                    <p className="line-clamp-2">
                      {pickText(active.images[viewerIndex].description, lang) || (lang === "vi" ? "Chưa có mô tả" : "No description")}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs">
                      {viewerIndex + 1}/{active.images.length}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
