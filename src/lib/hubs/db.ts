import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { HubConfig, HubDocRecord } from "@/lib/hubs/types";

// Hub chỉnh trong Admin được lưu ở bảng site_content (đã có sẵn, không cần migration):
//   config_key = "hub:<slug>"       -> payload = HubConfig
//   config_key = "hub-docs:<slug>"  -> payload = { docs: HubDocRecord[] }
export const HUB_KEY_PREFIX = "hub:";
export const HUB_DOCS_KEY_PREFIX = "hub-docs:";

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

// Local không có Supabase -> Admin ghi thẳng vào file trong repo.
export function isFileStorageMode() {
  return !getSupabaseServerClient();
}

export async function readDbHubConfigs(): Promise<Map<string, Partial<HubConfig>>> {
  const result = new Map<string, Partial<HubConfig>>();
  const supabase = getSupabaseServerClient();
  if (!supabase) return result;

  const { data, error } = await supabase.from("site_content").select("config_key,payload").like("config_key", `${HUB_KEY_PREFIX}%`);
  if (error) {
    console.error("[hubs] read site_content failed:", error.message);
    return result;
  }
  for (const row of (data ?? []) as Array<{ config_key: string; payload: Partial<HubConfig> | null }>) {
    const slug = row.config_key.slice(HUB_KEY_PREFIX.length);
    if (slug && row.payload && typeof row.payload === "object") result.set(slug, row.payload);
  }
  return result;
}

export async function readDbHubDocs(slug: string): Promise<HubDocRecord[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", `${HUB_DOCS_KEY_PREFIX}${slug}`).maybeSingle();
  if (error || !data?.payload) return null;
  const docs = (data.payload as { docs?: HubDocRecord[] }).docs;
  return Array.isArray(docs) ? docs : null;
}

export async function writeDbRow(configKey: string, payload: unknown) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("site_content")
    .upsert({ config_key: configKey, payload, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
  if (error) throw new Error(`Supabase write failed (${configKey}): ${error.message}`);
}

export async function deleteDbRows(keys: string[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("site_content").delete().in("config_key", keys);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}
