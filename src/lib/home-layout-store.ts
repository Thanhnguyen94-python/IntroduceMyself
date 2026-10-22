import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertReadable } from "@/lib/supabase/strict-read";
import { normalizeHomeLayout, type HomeLayoutConfig } from "@/lib/home-layout-types";

// Lưu chung bảng site_content (config_key = "home_layout"), giống cách site-store lưu profile.
const CONFIG_KEY = "home_layout";
const layoutPath = path.join(process.cwd(), "src", "content", "pages", "home-layout.json");

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export async function readHomeLayout(): Promise<HomeLayoutConfig> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", CONFIG_KEY).maybeSingle();
    assertReadable("home_layout", supabase, error);
    if (!error && data?.payload && typeof data.payload === "object") {
      return normalizeHomeLayout(data.payload as Partial<HomeLayoutConfig>);
    }
  }
  assertReadable("home_layout", supabase);

  try {
    const raw = await fs.readFile(layoutPath, "utf-8");
    return normalizeHomeLayout(JSON.parse(raw) as Partial<HomeLayoutConfig>);
  } catch {
    return normalizeHomeLayout(null);
  }
}

export async function writeHomeLayout(input: HomeLayoutConfig): Promise<HomeLayoutConfig> {
  const normalized = normalizeHomeLayout(input);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase
      .from("site_content")
      .upsert({ config_key: CONFIG_KEY, payload: normalized, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    if (!error) return normalized;
    if (isProductionRuntime()) throw new Error(`Supabase write failed (home_layout): ${error.message}`);
  } else if (isProductionRuntime()) {
    throw new Error("Supabase is not configured for server writes.");
  }

  await fs.writeFile(layoutPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}
