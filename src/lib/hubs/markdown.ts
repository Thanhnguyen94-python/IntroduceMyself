import { Marked, type Tokens } from "marked";
import type { HubDocTocItem } from "@/lib/hubs/types";

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
      // ![Mô tả](/assets/images/hubs/joy/wiring.png "Chú thích") -> ảnh bấm để phóng to, có chú thích.
      image(token: Tokens.Image) {
        const src = escapeAttr(token.href);
        const alt = escapeAttr(token.text);
        const img = `<a href="${src}" target="_blank" rel="noreferrer" class="doc-image"><img src="${src}" alt="${alt}" loading="lazy" /></a>`;
        return token.title ? `<figure>${img}<figcaption>${escapeAttr(token.title)}</figcaption></figure>` : img;
      }
    }
  });

  let html = marked.parse(markdown, { async: false }) as string;

  // Bảng rộng cuộn ngang trên điện thoại thay vì tràn trang.
  html = html.replace(/<table>/g, '<div class="doc-table"><table>').replace(/<\/table>/g, "</table></div>");

  // Callout kiểu GitHub: > [!WARNING]
  html = html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|DANGER)\]\s*/g, (_m, kind: string) => {
    const c = CALLOUTS[kind];
    return `<blockquote class="callout callout-${c.cls}"><p class="callout-title">${c.icon} ${c.label}</p><p>`;
  });

  // Link ra ngoài mở tab mới.
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noreferrer"');

  return { html, toc };
}
