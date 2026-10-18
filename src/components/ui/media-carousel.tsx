"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SmartMedia } from "@/components/ui/smart-media";
import { useLanguage } from "@/components/providers/language-provider";
import type { LocalizedText } from "@/lib/content/types";
import type { MediaKind } from "@/lib/smart-media";

export type CarouselItem = { url: string; kind?: MediaKind; caption?: LocalizedText };

// Slideshow ảnh/video: tự chuyển sau `interval` giây, dừng khi rê chuột, khi đang xem video
// hoặc khi người dùng bật giảm chuyển động. Vuốt trên điện thoại, phím ← → trên máy tính.
export function MediaCarousel({
  items,
  interval = 5,
  alt,
  className = "",
  autoplayVideo = false
}: {
  items: CarouselItem[];
  interval?: number;
  alt: string;
  className?: string;
  autoplayVideo?: boolean;
}) {
  const { lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || hovered || mediaPlaying || reducedMotion) return;
    const timer = window.setTimeout(() => go(index + 1), Math.max(2, interval) * 1000);
    return () => window.clearTimeout(timer);
  }, [count, hovered, mediaPlaying, reducedMotion, interval, index, go]);

  const onPlayingChange = useCallback((playing: boolean) => setMediaPlaying(playing), []);

  if (!count) return null;
  const current = items[index];
  const caption = current?.caption?.[lang] || current?.caption?.vi;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border shadow-2xl ${className}`}
      style={{ borderColor: "var(--border)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      tabIndex={count > 1 ? 0 : undefined}
      role={count > 1 ? "region" : undefined}
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={alt}
    >
      <div className="relative aspect-[4/3] w-full">
        {items.map((item, idx) => {
          const active = idx === index;
          return (
            <div
              key={`${item.url}-${idx}`}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
              aria-hidden={!active}
            >
              {/* Chỉ render slide đang hiện + slide kề bên để không tải hết video cùng lúc. */}
              {(active || Math.abs(idx - index) === 1 || (index === 0 && idx === count - 1)) && (
                <SmartMedia
                  url={item.url}
                  kind={item.kind}
                  alt={`${alt} ${idx + 1}`}
                  autoplay={active && autoplayVideo}
                  onPlayingChange={active ? onPlayingChange : undefined}
                />
              )}
            </div>
          );
        })}
      </div>

      {caption && (
        <p className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-10 text-sm text-white">{caption}</p>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => go(idx)}
                className={`h-2 rounded-full transition-all ${idx === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                aria-label={`Slide ${idx + 1}`}
                aria-current={idx === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
