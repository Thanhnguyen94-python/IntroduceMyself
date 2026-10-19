"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SmartMedia } from "@/components/ui/smart-media";
import { useLanguage } from "@/components/providers/language-provider";
import type { LocalizedText } from "@/lib/content/types";
import type { MediaKind } from "@/lib/smart-media";

export type CarouselItem = { url: string; kind?: MediaKind; caption?: LocalizedText };

// Slideshow ảnh/video: tự chuyển sau `interval` giây.
// Tạm dừng khi: rê CHUỘT vào (chạm trên điện thoại không tính), người xem đang phát video,
// người xem bấm ⏸, hoặc tab trình duyệt bị ẩn.
// Máy bật "giảm chuyển động" (vd Windows tắt Animation effects): vẫn tự chuyển nhưng đổi ảnh tức thì, không hiệu ứng mờ.
// Slideshow cuộn ra khỏi màn hình cũng tạm dừng (nhiều thẻ sản phẩm không cùng chạy ngầm).
export function MediaCarousel({
  items,
  interval = 5,
  alt,
  className = "",
  autoplayVideo = false,
  frameClassName = "rounded-3xl border shadow-2xl",
  aspectClassName = "aspect-[4/3]",
  fit = "cover",
  startDelay = 0,
  activeIndex,
  onIndexChange,
  children
}: {
  items: CarouselItem[];
  interval?: number;
  alt: string;
  className?: string;
  autoplayVideo?: boolean;
  // Khung ngoài & tỉ lệ khung hình (thẻ sản phẩm dùng khung gọn hơn ảnh bìa).
  frameClassName?: string;
  aspectClassName?: string;
  fit?: "cover" | "contain";
  // Lệch nhịp lần chuyển đầu tiên (ms) để các thẻ trong lưới không đổi ảnh cùng lúc.
  startDelay?: number;
  // Điều khiển từ ngoài (vd bấm ảnh nhỏ bên dưới) + báo slide đang hiện.
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  // Lớp phủ trong khung (nhãn giảm giá, link phủ toàn ảnh...), nằm dưới các nút điều khiển.
  children?: ReactNode;
}) {
  const { lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [firstRun, setFirstRun] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);
  const count = items.length;
  const seconds = Math.max(2, interval);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (typeof activeIndex === "number" && activeIndex >= 0 && activeIndex < count) setIndex(activeIndex);
  }, [activeIndex, count]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // Danh sách ảnh đổi (vd Admin xoá bớt ảnh) -> không để index vượt quá.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [index, count]);

  const paused = userPaused || hovered || mediaPlaying || pageHidden || offscreen;

  useEffect(() => {
    if (count < 2 || paused) return;
    const delay = seconds * 1000 + (firstRun ? startDelay : 0);
    const timer = window.setTimeout(() => {
      setFirstRun(false);
      go(index + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [count, paused, seconds, index, go, firstRun, startDelay]);

  const onPlayingChange = useCallback((playing: boolean) => setMediaPlaying(playing), []);

  if (!count) return null;
  const current = items[index];
  const caption = current?.caption?.[lang] || current?.caption?.vi;
  const vi = lang === "vi";

  // Khoảng cách vòng tròn tới slide đang hiện (để render sẵn slide kề bên, kể cả khi quay vòng).
  const distance = (idx: number) => {
    const d = Math.abs(idx - index);
    return Math.min(d, count - d);
  };

  return (
    <div
      ref={rootRef}
      className={`group relative overflow-hidden ${frameClassName} ${className}`}
      style={{ borderColor: "var(--border)" }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
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
      <div className={`relative w-full ${aspectClassName}`}>
        {items.map((item, idx) => {
          const active = idx === index;
          return (
            <div
              key={`${item.url}-${idx}`}
              className={`absolute inset-0 ${reducedMotion ? "" : "transition-opacity duration-700"} ${active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
              aria-hidden={!active}
            >
              {/* Chỉ render slide đang hiện + slide kề bên để không tải hết video cùng lúc. */}
              {distance(idx) <= 1 && (
                <SmartMedia
                  url={item.url}
                  kind={item.kind}
                  alt={`${alt} ${idx + 1}`}
                  fit={fit}
                  autoplay={active && autoplayVideo}
                  onPlayingChange={active ? onPlayingChange : undefined}
                />
              )}
            </div>
          );
        })}
      </div>

      {children}

      {caption && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-9 pt-10 text-sm text-white">{caption}</p>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            aria-label={vi ? "Ảnh trước" : "Previous"}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            aria-label={vi ? "Ảnh tiếp" : "Next"}
          >
            ›
          </button>

          <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              className="mr-1 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-[10px] text-white hover:bg-black/60"
              aria-label={userPaused ? (vi ? "Chạy slideshow" : "Play slideshow") : vi ? "Tạm dừng slideshow" : "Pause slideshow"}
              aria-pressed={userPaused}
            >
              {userPaused ? "▶" : "❚❚"}
            </button>
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

          {/* Thanh đếm giờ tới slide kế tiếp; key theo index để chạy lại mỗi lần đổi slide. */}
          {!paused && (
            <span
              key={`progress-${index}`}
              className="carousel-progress absolute bottom-0 left-0 z-20 h-0.5 bg-white/80"
              style={{ animationDuration: `${seconds + (firstRun ? startDelay / 1000 : 0)}s` }}
              aria-hidden
            />
          )}
        </>
      )}
    </div>
  );
}
