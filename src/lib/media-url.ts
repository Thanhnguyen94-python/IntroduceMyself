export function normalizeGoogleDriveImageUrl(url: string) {
  const input = (url || "").trim();
  if (!input) return "";

  const fileMatch = input.match(/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const openMatch = input.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  const fileId = fileMatch?.[1] ?? openMatch?.[1] ?? "";

  if (!fileId) return input;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function getYouTubeVideoId(url: string) {
  const input = (url || "").trim();
  if (!input) return "";

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return id;
    }

    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const markerIndex = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");
      if (markerIndex >= 0) {
        return parts[markerIndex + 1] ?? "";
      }
    }
  } catch {
    // ignore invalid URL
  }

  return "";
}

export function getYouTubeEmbedUrl(url: string) {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

export function resolveMedia(url: string) {
  const normalizedUrl = normalizeGoogleDriveImageUrl(url);
  const youtubeId = getYouTubeVideoId(normalizedUrl);
  if (youtubeId) {
    return {
      type: "youtube" as const,
      youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      src: normalizedUrl
    };
  }

  return {
    type: "image" as const,
    youtubeId: "",
    embedUrl: "",
    src: normalizedUrl
  };
}
