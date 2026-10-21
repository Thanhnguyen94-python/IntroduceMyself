import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Cài đặt riêng của SMT Workspace (admin + trợ lý sửa được): lịch báo cáo tự động, bật tóm tắt AI.
// Lưu site_content['smt_workspace'] (Supabase) hoặc .data/smt-workspace.json (local).

export type WorkspaceSettings = {
  reports: {
    enabled: boolean;
    // Giờ chốt báo cáo trong ngày (giờ VN), vd cuối mỗi ca: ["06:00", "14:00", "22:00"]. Mỗi lần chốt
    // tổng hợp khoảng thời gian từ lần chốt trước đến lần này.
    dailyTimes: string[];
    // Báo cáo tuần: thứ (1 = Thứ Hai ... 7 = Chủ nhật) + giờ chốt.
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime: string;
  };
  // Tóm tắt chat bằng AI trong báo cáo (cần AI_API_KEY). Mặc định tắt.
  aiSummary: boolean;
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  reports: { enabled: true, dailyTimes: ["17:30"], weeklyEnabled: true, weeklyDay: 1, weeklyTime: "08:00" },
  aiSummary: false
};

const KEY = "smt_workspace";
const DEV_FILE = path.join(process.cwd(), ".data", "smt-workspace.json");
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeWorkspaceSettings(input: Partial<WorkspaceSettings> | null): WorkspaceSettings {
  const d = DEFAULT_WORKSPACE_SETTINGS;
  const r = (input?.reports ?? {}) as Partial<WorkspaceSettings["reports"]>;
  const times = Array.isArray(r.dailyTimes) ? [...new Set(r.dailyTimes.map(String).filter((t) => TIME.test(t)))].sort().slice(0, 6) : d.reports.dailyTimes;
  return {
    reports: {
      enabled: r.enabled === undefined ? d.reports.enabled : Boolean(r.enabled),
      dailyTimes: times.length ? times : d.reports.dailyTimes,
      weeklyEnabled: r.weeklyEnabled === undefined ? d.reports.weeklyEnabled : Boolean(r.weeklyEnabled),
      weeklyDay: Math.min(7, Math.max(1, Math.round(Number(r.weeklyDay) || d.reports.weeklyDay))),
      weeklyTime: TIME.test(String(r.weeklyTime)) ? String(r.weeklyTime) : d.reports.weeklyTime
    },
    aiSummary: Boolean(input?.aiSummary)
  };
}

export async function readWorkspaceSettings(): Promise<WorkspaceSettings> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", KEY).maybeSingle();
    if (error) console.error("[smt] read workspace settings failed:", error.message);
    return normalizeWorkspaceSettings((data?.payload as Partial<WorkspaceSettings>) ?? null);
  }
  try {
    return normalizeWorkspaceSettings(JSON.parse(await fs.readFile(DEV_FILE, "utf-8")) as Partial<WorkspaceSettings>);
  } catch {
    return normalizeWorkspaceSettings(null);
  }
}

export async function writeWorkspaceSettings(input: Partial<WorkspaceSettings>) {
  const settings = normalizeWorkspaceSettings(input);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("site_content").upsert({ config_key: KEY, payload: settings, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    if (error) throw new Error(`Lưu cài đặt thất bại: ${error.message}`);
    return settings;
  }
  await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
  await fs.writeFile(DEV_FILE, JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}
