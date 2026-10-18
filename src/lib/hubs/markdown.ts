import { Marked, type Tokens } from "marked";
import type { HubDocTocItem } from "@/lib/hubs/types";
import { resolveSmartMedia } from "@/lib/smart-media";

export type Frontmatter = Record<string, string>;

// Frontmatter tối giản: các dòng `key: value` nằm giữa hai dòng `---`.
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: source };

  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
    if (key) data[key] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

const FRAME = (src: string, title: string) =>
  `<div class="doc-embed"><iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;

// HTML cho 1 media trong tài liệu. mode "embed": link Drive hiện khung xem trước (ảnh/video/PDF đều xem được).
function renderMediaHtml(rawUrl: string, alt: string, mode: "image" | "embed" = "image") {
  const media = resolveSmartMedia(decodeEntities(rawUrl));
  const altText = alt || "media";
  switch (media.type) {
    case "youtube":
      return FRAME(media.embedUrl, altText);
    case "drive": {
      // ![video ...](drive) hoặc dòng link trần -> khung xem trước; còn lại hiển thị như ảnh.
      if (mode === "embed" || /^(video|clip|pdf|tai lieu|tài liệu)/i.test(alt)) return FRAME(media.previewUrl, altText);
      const src = escapeAttr(media.imageUrl);
      return `<a href="${escapeAttr(media.canonical)}" target="_blank" rel="noreferrer" class="doc-image"><img src="${src}" alt="${escapeAttr(altText)}" loading="lazy" referrerpolicy="no-referrer" /></a>`;
    }
    case "video":
      return `<video class="doc-video" src="${escapeAttr(media.src)}" controls preload="metadata" playsinline></video>`;
    case "pdf":
      return `<div class="doc-embed doc-embed-pdf"><iframe src="${escapeAttr(media.src)}" title="${escapeAttr(altText)}" loading="lazy"></iframe></div>`;
    case "image": {
      const src = escapeAttr(media.src);
      return `<a href="${src}" target="_blank" rel="noreferrer" class="doc-image"><img src="${src}" alt="${escapeAttr(altText)}" loading="lazy" /></a>`;
    }
    default:
      return "";
  }
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/gi, "d")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CALLOUTS: Record<string, { cls: string; label: string; icon: string }> = {
  NOTE: { cls: "note", label: "Ghi chú", icon: "ℹ️" },
  TIP: { cls: "tip", label: "Mẹo", icon: "💡" },
  IMPORTANT: { cls: "important", label: "Quan trọng", icon: "📌" },
  WARNING: { cls: "warning", label: "Cảnh báo", icon: "⚠️" },
  DANGER: { cls: "danger", label: "Nguy hiểm", icon: "⛔" }
};

// Render Markdown (GFM) -> HTML + mục lục (h2/h3). Nội dung do chủ dự án viết nên được tin cậy.
export function renderMarkdown(markdown: string): { html: string; toc: HubDocTocItem[] } {
  const toc: HubDocTocItem[] = [];
  const usedIds = new Map<string, number>();

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(this: { parser: { parseInline: (tokens: Tokens.Heading["tokens"]) => string } }, token: Tokens.Heading) {
        const inner = this.parser.parseInline(token.tokens);
        const plain = inner.replace(/<[^>]+>/g, "").trim();
        const base = slugify(plain) || "section";
        const count = usedIds.get(base) ?? 0;
        usedIds.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        if (token.depth === 2 || token.depth === 3) {
          toc.push({ id, text: plain, depth: token.depth });
        }
        return `<h${token.depth} id="${id}"><a class="doc-anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${token.depth}>\n`;
      },
      // ![Mô tả](link "Chú thích"): link có thể là ảnh, file video, YouTube hoặc Google Drive.
      image(token: Tokens.Image) {
        const body = renderMediaHtml(token.href, token.text);
        return token.title ? `<figure>${body}<figcaption>${escapeAttr(token.title)}</figcaption></figure>` : body;
      }
    }
  });

  let html = marked.parse(markdown, { async: false }) as string;

  // Dòng chỉ chứa 1 link YouTube / Google Drive -> tự nhúng trình xem (không hiện link thô).
  html = html.replace(/<p><a href="([^"]+)">([^<]*)<\/a><\/p>/g, (whole, href: string, text: string) => {
    const url = decodeEntities(href);
    if (decodeEntities(text).trim() !== url.trim()) return whole;
    const media = resolveSmartMedia(url);
    if (media.type === "youtube" || media.type === "drive") return renderMediaHtml(url, "", "embed");
    return whole;
  });

  // Bảng rộng cuộn ngang trên điện thoại thay vì tràn trang.
  html = html.replace(/<table>/g, '<div class="doc-table"><table>').replace(/<\/table>/g, "</table></div>");

  // Callout kiểu GitHub: > [!WARNING]
  html = html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|DANGER)\]\s*/g, (_m, kind: string) => {
    const c = CALLOUTS[kind];
    return `<blockquote class="callout callout-${c.cls}"><p class="callout-title">${c.icon} ${c.label}</p><p>`;
  });

  // Media khối (figure / khung nhúng / video) không được nằm trong <p>.
  html = html.replace(/<p>\s*(<figure>[\s\S]*?<\/figure>|<div class="doc-embed[\s\S]*?<\/div>|<video [\s\S]*?<\/video>)\s*<\/p>/g, "$1");

  // Link ra ngoài mở tab mới (bỏ qua link đã có target).
  html = html.replace(/<a href="(https?:\/\/[^"]+)"(?! target=)/g, '<a href="$1" target="_blank" rel="noreferrer"');

  return { html, toc };
}
