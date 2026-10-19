"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { SmartMedia } from "@/components/ui/smart-media";
import { resolveSmartMedia } from "@/lib/smart-media";
import type { ShopMedia } from "@/lib/shop/types";

function thumbOf(item: ShopMedia) {
  const media = resolveSmartMedia(item.url, item.kind ?? "auto");
  if (media.type === "image") return media.src;
  if (media.type === "youtube") return media.thumbnail;
  if (media.type === "drive") return media.imageUrl;
  return "";
}

// Ảnh sản phẩm: slideshow tự chuyển + dải ảnh nhỏ để chọn + bấm ảnh để xem toàn màn hình.
export function ProductGallery({ media, alt, interval = 5, badges }: { media: ShopMedia[]; alt: string; interval?: number; badges?: React.ReactNode }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const [current, setCurrent] = useState(0);
  const [jump, setJump] = useState<number | undefined>(undefined);
  const [zoom, setZoom] = useState<number | null>(null);
  const items = media.length ? media : [{ url: "" }];
  const currentType = resolveSmartMedia(items[current]?.url ?? "", items[current]?.kind ?? "auto").type;
  const zoomable = currentType === "image" || currentType === "drive";

  const select = (idx: number) => {
    setJump(idx);
    setCurrent(idx);
  };

  // Slideshow tự chuyển sang ảnh khác -> bỏ "ảnh đã chọn" để lần bấm sau (kể cả cùng ảnh) vẫn có tác dụng.
  const onIndexChange = useCallback((idx: number) => {
    setCurrent(idx);
    setJump((j) => (j === idx ? j : undefined));
  }, []);

  const move = useCallback((delta: number) => setZoom((z) => (z === null ? z : (z + delta + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, move]);

  return (
    <div className="space-y-3">
      <MediaCarousel items={items} alt={alt} interval={interval} activeIndex={jump} onIndexChange={onIndexChange} frameClassName="rounded-2xl border shadow-lg" aspectClassName="aspect-square sm:aspect-[4/3]">
        {zoomable && (
          <button type="button" className="absolute inset-0 z-[15] cursor-zoom-in" onClick={() => setZoom(current)} aria-label={vi ? "Phóng to ảnh" : "Zoom image"} />
        )}
        {badges && <div className="pointer-events-none absolute left-3 top-3 z-[16] flex flex-wrap gap-1.5">{badges}</div>}
      </MediaCarousel>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label={vi ? "Ảnh sản phẩm" : "Product images"}>
          {items.map((item, idx) => {
            const thumb = thumbOf(item);
            const isVideo = resolveSmartMedia(item.url, item.kind ?? "auto").type === "youtube";
            return (
              <button
                key={`${item.url}-${idx}`}
                type="button"
                role="listitem"
                onClick={() => select(idx)}
                aria-label={`${vi ? "Ảnh" : "Image"} ${idx + 1}`}
                aria-current={idx === current}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-20 ${idx === current ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full w-full place-items-center bg-slate-200 text-xs dark:bg-slate-700">{idx + 1}</span>}
                {isVideo && <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">▶</span>}
              </button>
            );
          })}
        </div>
      )}

      {zoom !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setZoom(null)}>
          <div className="h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <SmartMedia url={items[zoom].url} kind={items[zoom].kind} alt={alt} fit="contain" />
          </div>
          <button type="button" onClick={() => setZoom(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label={vi ? "Đóng" : "Close"}>
            ✕
          </button>
          {items.length > 1 && (
            <>
              <button type="button" onClick={(e) => (e.stopPropagation(), move(-1))} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25" aria-label={vi ? "Ảnh trước" : "Previous"}>
                ‹
              </button>
              <button type="button" onClick={(e) => (e.stopPropagation(), move(1))} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25" aria-label={vi ? "Ảnh tiếp" : "Next"}>
                ›
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                {zoom + 1} / {items.length}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
