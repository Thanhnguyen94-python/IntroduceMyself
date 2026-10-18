import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { HUBS_DIR, getHub } from "@/lib/hubs/registry";
import { parseFrontmatter, renderMarkdown } from "@/lib/hubs/markdown";
import type { HubDoc, HubDocMeta } from "@/lib/hubs/types";

// Tài liệu của hub = file .md trong src/content/hubs/<hub>/docs/ (thư mục con -> đường dẫn con).
// VD: docs/hardware/bom.md -> /<hub>/docs/hardware/bom

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

function docsDir(hub: string) {
  return path.join(HUBS_DIR, hub, "docs");
}

async function readDocFile(hub: string, slug: string[]) {
  const safe = slug.every((part) => /^[a-z0-9][a-z0-9-]*$/.test(part));
  if (!safe) return null;
  try {
    const raw = await fs.readFile(path.join(docsDir(hub), ...slug) + ".md", "utf-8");
    return parseFrontmatter(raw);
  } catch {
    return null;
  }
}

function toMeta(hub: string, slug: string[], data: Record<string, string>): HubDocMeta {
  return {
    hub,
    slug,
    path: `/${hub}/docs/${slug.join("/")}`,
    title: data.title || slug[slug.length - 1],
    description: data.description || "",
    section: data.section || "general",
    order: Number(data.order ?? 100),
    updated: data.updated
  };
}

export const listHubDocs = cache(async (hub: string): Promise<HubDocMeta[]> => {
  const config = await getHub(hub);
  if (!config) return [];

  const slugs = await walkMarkdown(docsDir(hub));
  const metas = await Promise.all(
    slugs.map(async (slug) => {
      const file = await readDocFile(hub, slug);
      return file ? toMeta(hub, slug, file.data) : null;
    })
  );

  const sectionOrder = config.docSections.map((it) => it.id);
  const rank = (section: string) => {
    const idx = sectionOrder.indexOf(section);
    return idx === -1 ? sectionOrder.length : idx;
  };

  return metas
    .filter((it): it is HubDocMeta => it !== null)
    .sort((a, b) => rank(a.section) - rank(b.section) || a.order - b.order || a.title.localeCompare(b.title));
});

export const getHubDoc = cache(async (hub: string, slug: string[]): Promise<HubDoc | null> => {
  const file = await readDocFile(hub, slug);
  if (!file) return null;
  const { html, toc } = renderMarkdown(file.body);
  return { ...toMeta(hub, slug, file.data), html, toc };
});
