import { promises as fs } from "fs";
import path from "path";
import type { ManagedPageKey, SiteVisibilityConfig } from "@/lib/site-visibility-types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const visibilityPath = path.join(process.cwd(), "src", "content", "pages", "visibility.json");
const pageKeys: ManagedPageKey[] = ["overview", "journey", "projects", "showcase", "docs"];

type SiteVisibilityRow = {
  page_key: string;
  is_enabled: boolean;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

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
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase.from("site_visibility").select("page_key,is_enabled");

    if (!error && Array.isArray(data) && data.length > 0) {
      const base = createDefaultVisibility();
      const rows = data as SiteVisibilityRow[];

      const pages = rows.reduce<Record<ManagedPageKey, boolean>>((acc, row) => {
        const key = row.page_key as ManagedPageKey;
        if (pageKeys.includes(key)) {
          acc[key] = Boolean(row.is_enabled);
        }
        return acc;
      }, { ...base.pages });

      return {
        schemaVersion: 1,
        pages
      };
    }
  }

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

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const rows = pageKeys.map((key) => ({
      page_key: key,
      is_enabled: normalized.pages[key]
    }));

    const { error } = await supabase
      .from("site_visibility")
      .upsert(rows, { onConflict: "page_key" });

    if (!error) {
      return normalized;
    }

    if (isProductionRuntime()) {
      throw new Error(`Supabase write failed (site_visibility upsert): ${error.message}`);
    }
  } else if (isProductionRuntime()) {
    throw new Error("Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  await fs.writeFile(visibilityPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}
