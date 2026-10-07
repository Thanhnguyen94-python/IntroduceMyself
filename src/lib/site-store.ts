import { promises as fs } from "fs";
import path from "path";
import type { SiteData } from "@/lib/content/types";
import { normalizeSiteData } from "@/lib/content/normalizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const sitePath = path.join(process.cwd(), "src", "content", "pages", "site.json");

type SiteContentRow = {
  config_key: string;
  payload: SiteData | null;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

async function readSiteDataFromFile(): Promise<SiteData> {
  const raw = await fs.readFile(sitePath, "utf-8");
  const parsed = JSON.parse(raw) as SiteData;
  return normalizeSiteData(parsed);
}

async function writeSiteDataToFile(payload: SiteData) {
  await fs.writeFile(sitePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function readSiteData(): Promise<SiteData> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("site_content")
      .select("config_key,payload")
      .eq("config_key", "primary")
      .maybeSingle();

    if (!error && data && typeof data === "object") {
      const row = data as SiteContentRow;
      if (row.payload && typeof row.payload === "object") {
        return normalizeSiteData(row.payload);
      }
    }
  }

  return readSiteDataFromFile();
}

export async function writeSiteData(input: SiteData): Promise<SiteData> {
  const normalized = normalizeSiteData(input);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase.from("site_content").upsert(
      {
        config_key: "primary",
        payload: normalized
      },
      { onConflict: "config_key" }
    );

    if (!error) {
      return normalized;
    }

    if (isProductionRuntime()) {
      throw new Error(`Supabase write failed (site_content upsert): ${error.message}`);
    }
  } else if (isProductionRuntime()) {
    throw new Error(
      "Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  await writeSiteDataToFile(normalized);
  return normalized;
}
