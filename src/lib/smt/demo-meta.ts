import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Thông tin bộ dữ liệu demo đã lưu trong database: kỳ dữ liệu + số dòng từng bảng.
// Lưu ở site_content['smt_demo'] (Supabase) hoặc .data/smt-demo.json (local). Không có = chưa tạo demo.

export type DemoMeta = { from: string; to: string; seededAt: string; complete: boolean; counts: Record<string, number> };

const KEY = "smt_demo";
const DEV_FILE = path.join(process.cwd(), ".data", "smt-demo.json");

export async function readDemoMeta(): Promise<DemoMeta | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", KEY).maybeSingle();
    if (error) console.error("[smt] read demo meta failed:", error.message);
    const meta = (data?.payload as DemoMeta | undefined) ?? null;
    return meta?.complete ? meta : null;
  }
  try {
    const meta = JSON.parse(await fs.readFile(DEV_FILE, "utf-8")) as DemoMeta;
    return meta.complete ? meta : null;
  } catch {
    return null;
  }
}

export async function writeDemoMeta(meta: DemoMeta | null) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = meta
      ? await supabase.from("site_content").upsert({ config_key: KEY, payload: meta, updated_at: new Date().toISOString() }, { onConflict: "config_key" })
      : await supabase.from("site_content").delete().eq("config_key", KEY);
    if (error) throw new Error(`Lưu thông tin demo thất bại: ${error.message}`);
    return;
  }
  if (!meta) return fs.rm(DEV_FILE, { force: true });
  await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
  await fs.writeFile(DEV_FILE, JSON.stringify(meta, null, 2), "utf-8");
}
