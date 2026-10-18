import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import type { HubBlock, HubBlockId, HubConfig, HubMediaItem, HubSource, HubSummary } from "@/lib/hubs/types";
import type { HubPageKey } from "@/lib/site-visibility-types";
import { readDbHubConfigs } from "@/lib/hubs/db";
import { normalizeMediaUrl } from "@/lib/smart-media";

// Chỉ dùng ở server. Một hub có thể đến từ:
//   - file: src/content/hubs/<slug>/hub.json (bản gốc trong repo)
//   - database: tạo/sửa trong Admin (site_content "hub:<slug>"), ghi đè bản file nếu trùng slug
export const HUBS_DIR = path.join(process.cwd(), "src", "content", "hubs");

export const HUB_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
// Slug trùng route tĩnh / thư mục public sẽ không bao giờ mở được hub.
export const RESERVED_HUB_SLUGS = new Set(["admin", "api", "assets", "firmware", "cv", "du-an", "hanh-trinh", "san-pham-trung-bay", "tai-lieu-ky-thuat", "tong-quan", "_next"]);

const emptyText = { vi: "", en: "" };
const BLOCK_IDS: HubBlockId[] = ["features", "specs-docs", "latest"];

function normalizeLayout(raw: unknown): HubBlock[] {
  const seen = new Set<HubBlockId>();
  const blocks: HubBlock[] = [];
  for (const item of Array.isArray(raw) ? (raw as HubBlock[]) : []) {
    if (!item || !BLOCK_IDS.includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    blocks.push({ id: item.id, enabled: item.enabled !== false });
  }
  for (const id of BLOCK_IDS) if (!seen.has(id)) blocks.push({ id, enabled: true });
  return blocks;
}

function normalizeMedia(raw: Partial<HubConfig>): HubMediaItem[] {
  const list = Array.isArray(raw.media) ? raw.media : [];
  const items = list
    .filter((it) => it && typeof it.url === "string" && it.url.trim())
    .map((it) => ({ url: normalizeMediaUrl(it.url), kind: it.kind ?? "auto", caption: it.caption }));
  if (!items.length && raw.cover) items.push({ url: normalizeMediaUrl(raw.cover), kind: "auto", caption: undefined });
  return items;
}

export function normalizeHub(raw: Partial<HubConfig>, slug: string): HubConfig {
  return {
    schemaVersion: Number(raw.schemaVersion ?? 1),
    slug,
    name: raw.name || slug,
    emoji: raw.emoji || "🤖",
    order: Number(raw.order ?? 100),
    status: raw.status ?? "beta",
    tagline: raw.tagline ?? emptyText,
    description: raw.description ?? emptyText,
    cover: raw.cover,
    media: normalizeMedia(raw),
    mediaInterval: Math.min(30, Math.max(2, Number(raw.mediaInterval ?? 5))),
    autoplayVideo: Boolean(raw.autoplayVideo),
    layout: normalizeLayout(raw.layout),
    caseStudySlug: raw.caseStudySlug || undefined,
    firmware: raw.firmware?.board ? raw.firmware : undefined,
    features: raw.features ?? [],
    specs: raw.specs ?? [],
    docSections: raw.docSections ?? [],
    updates: raw.updates ?? [],
    links: raw.links ?? []
  };
}

async function readFileHubs(): Promise<Map<string, Partial<HubConfig>>> {
  const result = new Map<string, Partial<HubConfig>>();
  let folders: string[] = [];
  try {
    const dirents = await fs.readdir(HUBS_DIR, { withFileTypes: true });
    folders = dirents.filter((it) => it.isDirectory() && HUB_SLUG_PATTERN.test(it.name)).map((it) => it.name);
  } catch {
    return result;
  }
  await Promise.all(
    folders.map(async (folder) => {
      try {
        const raw = await fs.readFile(path.join(HUBS_DIR, folder, "hub.json"), "utf-8");
        result.set(folder, JSON.parse(raw) as Partial<HubConfig>);
      } catch {
        // thư mục không có hub.json hợp lệ -> bỏ qua
      }
    })
  );
  return result;
}

export type HubEntry = { config: HubConfig; source: HubSource; hasFile: boolean };

export const listHubEntries = cache(async (): Promise<HubEntry[]> => {
  const [files, db] = await Promise.all([readFileHubs(), readDbHubConfigs()]);
  const slugs = new Set([...files.keys(), ...db.keys()].filter((slug) => HUB_SLUG_PATTERN.test(slug)));
  const entries: HubEntry[] = [];
  for (const slug of slugs) {
    const fromDb = db.get(slug);
    const fromFile = files.get(slug);
    const raw = fromDb ?? fromFile;
    if (!raw) continue;
    entries.push({
      config: normalizeHub(raw, slug),
      source: fromDb ? (fromFile ? "database-override" : "database") : "file",
      hasFile: Boolean(fromFile)
    });
  }
  return entries.sort((a, b) => a.config.order - b.config.order || a.config.name.localeCompare(b.config.name));
});

export const listHubs = cache(async (): Promise<HubConfig[]> => (await listHubEntries()).map((it) => it.config));

export const getHubEntry = cache(async (slug: string): Promise<HubEntry | null> => {
  const entries = await listHubEntries();
  return entries.find((it) => it.config.slug === slug) ?? null;
});

export const getHub = cache(async (slug: string): Promise<HubConfig | null> => (await getHubEntry(slug))?.config ?? null);

export function toHubSummary(hub: HubConfig): HubSummary {
  return {
    slug: hub.slug,
    name: hub.name,
    emoji: hub.emoji,
    status: hub.status,
    tagline: hub.tagline,
    order: hub.order,
    caseStudySlug: hub.caseStudySlug
  };
}

// Key dùng trong bảng site_visibility để bật/tắt từng hub từ Admin.
export function hubVisibilityKey(slug: string): HubPageKey {
  return `hub:${slug}`;
}
