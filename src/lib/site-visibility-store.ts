import { promises as fs } from "fs";
import path from "path";
import type { ManagedPageKey, SiteVisibilityConfig } from "@/lib/site-visibility-types";

const visibilityPath = path.join(process.cwd(), "src", "content", "pages", "visibility.json");
const pageKeys: ManagedPageKey[] = ["overview", "journey", "projects", "showcase", "docs"];

function createDefaultVisibility(): SiteVisibilityConfig {
  return {
    schemaVersion: 1,
    pages: {
      overview: true,
      journey: true,
      projects: true,
      showcase: true,
      docs: true
    }
  };
}

export async function readSiteVisibility(): Promise<SiteVisibilityConfig> {
  try {
    const raw = await fs.readFile(visibilityPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SiteVisibilityConfig>;
    const base = createDefaultVisibility();

    return {
      schemaVersion: Number(parsed?.schemaVersion ?? 1),
      pages: pageKeys.reduce((acc, key) => {
        acc[key] = typeof parsed?.pages?.[key] === "boolean" ? parsed.pages[key] : base.pages[key];
        return acc;
      }, { ...base.pages })
    };
  } catch {
    return createDefaultVisibility();
  }
}

export async function writeSiteVisibility(input: SiteVisibilityConfig): Promise<SiteVisibilityConfig> {
  const normalized: SiteVisibilityConfig = {
    schemaVersion: 1,
    pages: pageKeys.reduce<Record<ManagedPageKey, boolean>>((acc, key) => {
      acc[key] = Boolean(input?.pages?.[key]);
      return acc;
    }, {
      overview: true,
      journey: true,
      projects: true,
      showcase: true,
      docs: true
    })
  };

  await fs.writeFile(visibilityPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}
