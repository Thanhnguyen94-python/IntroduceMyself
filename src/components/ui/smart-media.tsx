"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveSmartMedia, type MediaKind } from "@/lib/smart-media";

type Props = {
  url: string;
  kind?: MediaKind;
  alt?: string;
  className?: string;
  fit?: "cover" | "contain";
  // Phát ngay (tắt tiếng) thay vì hiện thumbnail + nút ▶. Dùng cho slide đang hiển thị.
  autoplay?: boolean;
  // Báo cho component cha (vd slideshow) biết media này là video đang phát -> tạm dừng tự chuyển.
  onPlayingChange?: (playing: boolean) => void;
};

const frameAllow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

// Hiển thị thông minh 1 link: ảnh, video file, YouTube, Google Drive (ảnh/video/tài liệu), PDF.
export function SmartMedia({ url, kind = "auto", alt = "", className = "", fit = "cover", autoplay = false, onPlayingChange }: Props) {
  const media = useMemo(() => resolveSmartMedia(url, kind), [url, kind]);
  const [activated, setActivated] = useState(autoplay);
  const [driveAsFrame, setDriveAsFrame] = useState(kind === "video" || kind === "document");
  const [broken, setBroken] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    setActivated(autoplay);
    setBroken(false);
    setDriveAsFrame(kind === "video" || kind === "document");
  }, [url, kind, autoplay]);

  useEffect(() => {
    if (!onPlayingChange) return;
    // Drive dạng khung xem trước: không biết được đang phát hay không -> coi là đang xem.
    const playing = (media.type === "youtube" && activated) || (media.type === "drive" && driveAsFrame) || (media.type === "video" && videoPlaying);
    onPlayingChange(playing);
  }, [activated, driveAsFrame, videoPlaying, media.type, onPlayingChange]);

  const box = `relative h-full w-full overflow-hidden bg-slate-900/5 dark:bg-slate-800 ${className}`;
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";

  if (media.type === "empty" || broken) {
    return (
      <div className={`${box} grid place-items-center text-sm`} style={{ color: "var(--muted)" }}>
        {media.type === "empty" ? "Chưa có media" : "Không tải được media"}
      </div>
    );
  }

  if (media.type === "youtube") {
    if (!activated) {
      return (
        <button type="button" className={`${box} group`} onClick={() => setActivated(true)} aria-label={`Phát video ${alt}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.thumbnail} alt={alt} className={`h-full w-full ${objectFit} transition duration-500 group-hover:scale-105`} loading="lazy" />
          <span className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/25">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-2xl text-white shadow-xl transition group-hover:scale-110">▶</span>
          </span>
        </button>
      );
    }
    const src = `${media.embedUrl}&autoplay=1${autoplay ? "&mute=1" : ""}`;
    return (
      <div className={box}>
        <iframe src={src} title={alt || "YouTube video"} allow={frameAllow} allowFullScreen className="absolute inset-0 h-full w-full border-0" />
      </div>
    );
  }

  if (media.type === "drive") {
    if (driveAsFrame) {
      return (
        <div className={box}>
          <iframe src={media.previewUrl} title={alt || "Google Drive"} allow="autoplay" allowFullScreen className="absolute inset-0 h-full w-full border-0" loading="lazy" />
        </div>
      );
    }
    return (
      <div className={box}>
        {/* Link Drive không cho biết là ảnh hay video: thử ảnh trước, lỗi thì chuyển sang khung xem trước. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.imageUrl} alt={alt} className={`h-full w-full ${objectFit}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setDriveAsFrame(true)} />
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <div className={box}>
        <video
          src={media.src}
          className={`h-full w-full ${objectFit}`}
          controls={!autoplay}
          autoPlay={autoplay}
          muted={autoplay}
          loop={autoplay}
          playsInline
          preload="metadata"
          onPlay={() => setVideoPlaying(!autoplay)}
          onPause={() => setVideoPlaying(false)}
          onEnded={() => setVideoPlaying(false)}
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  if (media.type === "pdf") {
    return (
      <div className={box}>
        <iframe src={media.src} title={alt || "PDF"} className="absolute inset-0 h-full w-full border-0" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt={alt} className={`h-full w-full ${objectFit}`} loading="lazy" onError={() => setBroken(true)} />
    </div>
  );
}
