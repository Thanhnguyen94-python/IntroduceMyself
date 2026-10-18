import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import type { HubConfig, HubSummary } from "@/lib/hubs/types";
import type { HubPageKey } from "@/lib/site-visibility-types";

// Chỉ dùng ở server (đọc file system). Thêm hub mới = tạo thư mục
// src/content/hubs/<slug>/hub.json -> các route /<slug>, /<slug>/docs, /<slug>/flash tự sinh.
export const HUBS_DIR = path.join(process.cwd(), "src", "content", "hubs");

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const emptyText = { vi: "", en: "" };

function normalizeHub(raw: Partial<HubConfig>, folder: string): HubConfig {
  return {
    schemaVersion: Number(raw.schemaVersion ?? 1),
    slug: folder,
    name: raw.name ?? folder,
    emoji: raw.emoji ?? "🤖",
    order: Number(raw.order ?? 100),
    status: raw.status ?? "beta",
    tagline: raw.tagline ?? emptyText,
    description: raw.description ?? emptyText,
    cover: raw.cover,
    caseStudySlug: raw.caseStudySlug,
    firmware: raw.firmware,
    features: raw.features ?? [],
    specs: raw.specs ?? [],
    docSections: raw.docSections ?? [],
    updates: raw.updates ?? [],
    links: raw.links ?? []
  };
}

export const listHubs = cache(async (): Promise<HubConfig[]> => {
  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(HUBS_DIR, { withFileTypes: true });
    entries = dirents.filter((it) => it.isDirectory() && SLUG_PATTERN.test(it.name)).map((it) => it.name);
  } catch {
    return [];
  }

  const hubs = await Promise.all(
    entries.map(async (folder) => {
      try {
        const raw = await fs.readFile(path.join(HUBS_DIR, folder, "hub.json"), "utf-8");
        return normalizeHub(JSON.parse(raw) as Partial<HubConfig>, folder);
      } catch {
        return null;
      }
    })
  );

  return hubs.filter((it): it is HubConfig => it !== null).sort((a, b) => a.order - b.order);
});

export const getHub = cache(async (slug: string): Promise<HubConfig | null> => {
  const hubs = await listHubs();
  return hubs.find((it) => it.slug === slug) ?? null;
});

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
