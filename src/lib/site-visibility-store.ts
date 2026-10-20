import { promises as fs } from "fs";
import path from "path";
import { PORTFOLIO_PAGE_KEYS, type SiteVisibilityConfig } from "@/lib/site-visibility-types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hubVisibilityKey, listHubs } from "@/lib/hubs/registry";

const visibilityPath = path.join(process.cwd(), "src", "content", "pages", "visibility.json");

type SiteVisibilityRow = {
  page_key: string;
  is_enabled: boolean;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

// Danh sách key quản lý = các trang portfolio + 1 key cho mỗi Project Hub.
async function getManagedKeys(): Promise<string[]> {
  const hubs = await listHubs();
  return [...PORTFOLIO_PAGE_KEYS, ...hubs.map((hub) => hubVisibilityKey(hub.slug))];
}

function buildConfig(keys: string[], source: Record<string, unknown> | undefined): SiteVisibilityConfig {
  return {
    schemaVersion: 1,
    pages: keys.reduce<Record<string, boolean>>((acc, key) => {
      const value = source?.[key];
      acc[key] = typeof value === "boolean" ? value : true;
      return acc;
    }, {})
  };
}

export async function readSiteVisibility(): Promise<SiteVisibilityConfig> {
  const keys = await getManagedKeys();
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase.from("site_visibility").select("page_key,is_enabled");

    if (!error && Array.isArray(data) && data.length > 0) {
      const rows = data as SiteVisibilityRow[];
      const map = Object.fromEntries(rows.map((row) => [row.page_key, Boolean(row.is_enabled)]));
      return buildConfig(keys, map);
    }
  }

  try {
    const raw = await fs.readFile(visibilityPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SiteVisibilityConfig>;
    return buildConfig(keys, parsed?.pages);
  } catch {
    return buildConfig(keys, undefined);
  }
}

export async function writeSiteVisibility(input: SiteVisibilityConfig): Promise<SiteVisibilityConfig> {
  const keys = await getManagedKeys();
  const normalized = buildConfig(keys, input?.pages);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const rows = keys.map((key) => ({
      page_key: key,
      is_enabled: normalized.pages[key]
    }));

    const { error } = await supabase.from("site_visibility").upsert(rows, { onConflict: "page_key" });

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
