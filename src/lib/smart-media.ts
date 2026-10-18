// Nhận diện link media và chuyển sang dạng hiển thị phù hợp (dùng được cả server lẫn client).
// Hỗ trợ:
//  - YouTube: youtu.be/ID, watch?v=ID, shorts/ID, live/ID, embed/ID, m.youtube, youtube-nocookie, &t=90s
//  - Google Drive: file/d/ID/view, open?id=ID, uc?id=ID, lh3.googleusercontent.com/d/ID
//  - Video file (.mp4/.webm/.mov/.m4v), PDF, ảnh thường

export type MediaKind = "auto" | "image" | "video" | "document";

export type ResolvedMedia =
  | { type: "youtube"; id: string; start: number; embedUrl: string; thumbnail: string; canonical: string }
  | { type: "drive"; id: string; imageUrl: string; previewUrl: string; canonical: string; hint: MediaKind }
  | { type: "video"; src: string; canonical: string }
  | { type: "pdf"; src: string; canonical: string }
  | { type: "image"; src: string; canonical: string }
  | { type: "empty"; canonical: "" };

const ID = "[a-zA-Z0-9_-]";

function parseStart(value: string | null) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export function parseYouTube(input: string): { id: string; start: number } | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      id = url.searchParams.get("v") ?? "";
      if (!id) {
        const parts = url.pathname.split("/").filter(Boolean);
        const marker = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p));
        if (marker >= 0) id = parts[marker + 1] ?? "";
      }
    }
    if (!new RegExp(`^${ID}{11}$`).test(id)) return null;
    return { id, start: parseStart(url.searchParams.get("t") ?? url.searchParams.get("start")) };
  } catch {
    return null;
  }
}

export function parseDriveId(input: string): string | null {
  const value = input.trim();
  if (!/drive\.google\.com|docs\.google\.com|googleusercontent\.com/i.test(value)) return null;
  const patterns = [
    new RegExp(`/file/d/(${ID}{10,})`),
    new RegExp(`/d/(${ID}{10,})`),
    new RegExp(`[?&]id=(${ID}{10,})`)
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function resolveSmartMedia(rawUrl: string, hint: MediaKind = "auto"): ResolvedMedia {
  const url = (rawUrl ?? "").trim();
  if (!url) return { type: "empty", canonical: "" };

  const yt = parseYouTube(url);
  if (yt) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    if (yt.start) params.set("start", String(yt.start));
    return {
      type: "youtube",
      id: yt.id,
      start: yt.start,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt.id}?${params.toString()}`,
      thumbnail: `https://i.ytimg.com/vi/${yt.id}/hqdefault.jpg`,
      canonical: `https://www.youtube.com/watch?v=${yt.id}${yt.start ? `&t=${yt.start}s` : ""}`
    };
  }

  const driveId = parseDriveId(url);
  if (driveId) {
    return {
      type: "drive",
      id: driveId,
      imageUrl: `https://lh3.googleusercontent.com/d/${driveId}`,
      previewUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      canonical: `https://drive.google.com/file/d/${driveId}/view`,
      hint
    };
  }

  const path = url.split(/[?#]/)[0].toLowerCase();
  if (hint === "video" || /\.(mp4|webm|mov|m4v|ogg)$/.test(path)) return { type: "video", src: url, canonical: url };
  if (hint === "document" || path.endsWith(".pdf")) return { type: "pdf", src: url, canonical: url };
  return { type: "image", src: url, canonical: url };
}

// Chuẩn hoá link trước khi lưu: link chia sẻ YouTube/Drive -> dạng gốc ổn định, link khác giữ nguyên.
export function normalizeMediaUrl(rawUrl: string) {
  return resolveSmartMedia(rawUrl).canonical || (rawUrl ?? "").trim();
}

export function describeMedia(media: ResolvedMedia) {
  switch (media.type) {
    case "youtube":
      return "YouTube";
    case "drive":
      return "Google Drive";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "image":
      return "Ảnh";
    default:
      return "";
  }
}

// Ảnh đại diện nhỏ (thumbnail) cho danh sách trong Admin.
export function mediaThumbnail(media: ResolvedMedia) {
  if (media.type === "youtube") return media.thumbnail;
  if (media.type === "drive") return media.imageUrl;
  if (media.type === "image") return media.src;
  return "";
}
