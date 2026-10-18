import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { HUBS_DIR, getHub } from "@/lib/hubs/registry";
import { readDbHubDocs } from "@/lib/hubs/db";
import { parseFrontmatter, renderMarkdown } from "@/lib/hubs/markdown";
import type { HubDoc, HubDocMeta, HubDocRecord } from "@/lib/hubs/types";

// Tài liệu của hub:
//   - Đã lưu trong Admin -> site_content "hub-docs:<slug>" (ưu tiên)
//   - Chưa -> file .md trong src/content/hubs/<hub>/docs/ (thư mục con -> đường dẫn con)
// VD: docs/hardware/bom.md -> /<hub>/docs/hardware/bom

export const DOC_SLUG_PART = /^[a-z0-9][a-z0-9-]*$/;

async function walkMarkdown(dir: string, prefix: string[] = []): Promise<string[][]> {
  let dirents: import("fs").Dirent[] = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: string[][] = [];
  for (const it of dirents) {
    if (it.isDirectory()) {
      result.push(...(await walkMarkdown(path.join(dir, it.name), [...prefix, it.name])));
    } else if (it.isFile() && it.name.endsWith(".md") && !it.name.startsWith("_")) {
      result.push([...prefix, it.name.replace(/\.md$/, "")]);
    }
  }
  return result;
}

export function hubDocsDir(hub: string) {
  return path.join(HUBS_DIR, hub, "docs");
}

export function toDocRecord(slug: string[], data: Record<string, string>, body: string): HubDocRecord {
  return {
    slug,
    title: data.title || slug[slug.length - 1],
    description: data.description || "",
    section: data.section || "general",
    order: Number(data.order ?? 100),
    updated: data.updated || undefined,
    body
  };
}

export async function readFileDocRecords(hub: string): Promise<HubDocRecord[]> {
  const slugs = await walkMarkdown(hubDocsDir(hub));
  const records = await Promise.all(
    slugs.map(async (slug) => {
      if (!slug.every((part) => DOC_SLUG_PART.test(part))) return null;
      try {
        const raw = await fs.readFile(path.join(hubDocsDir(hub), ...slug) + ".md", "utf-8");
        const { data, body } = parseFrontmatter(raw);
        return toDocRecord(slug, data, body);
      } catch {
        return null;
      }
    })
  );
  return records.filter((it): it is HubDocRecord => it !== null);
}

export const loadDocRecords = cache(async (hub: string): Promise<{ records: HubDocRecord[]; source: "file" | "database" }> => {
  const fromDb = await readDbHubDocs(hub);
  if (fromDb) return { records: fromDb.filter((it) => Array.isArray(it.slug) && it.slug.every((p) => DOC_SLUG_PART.test(p))), source: "database" };
  return { records: await readFileDocRecords(hub), source: "file" };
});

function toMeta(hub: string, record: HubDocRecord): HubDocMeta {
  return {
    hub,
    slug: record.slug,
    path: `/${hub}/docs/${record.slug.join("/")}`,
    title: record.title,
    description: record.description,
    section: record.section,
    order: record.order,
    updated: record.updated
  };
}

export const listHubDocs = cache(async (hub: string): Promise<HubDocMeta[]> => {
  const config = await getHub(hub);
  if (!config) return [];
  const { records } = await loadDocRecords(hub);

  const sectionOrder = config.docSections.map((it) => it.id);
  const rank = (section: string) => {
    const idx = sectionOrder.indexOf(section);
    return idx === -1 ? sectionOrder.length : idx;
  };

  return records
    .map((record) => toMeta(hub, record))
    .sort((a, b) => rank(a.section) - rank(b.section) || a.order - b.order || a.title.localeCompare(b.title));
});

export const getHubDoc = cache(async (hub: string, slug: string[]): Promise<HubDoc | null> => {
  const { records } = await loadDocRecords(hub);
  const key = slug.join("/");
  const record = records.find((it) => it.slug.join("/") === key);
  if (!record) return null;
  const { html, toc } = renderMarkdown(record.body);
  return { ...toMeta(hub, record), html, toc };
});

// Ghi tài liệu ra file .md (dùng khi chạy local không có Supabase).
export function serializeDoc(record: HubDocRecord) {
  const lines = [
    "---",
    `title: ${record.title}`,
    `description: ${record.description}`,
    `section: ${record.section}`,
    `order: ${record.order}`,
    ...(record.updated ? [`updated: ${record.updated}`] : []),
    "---",
    ""
  ];
  return `${lines.join("\n")}${record.body.replace(/^\n+/, "")}`;
}
