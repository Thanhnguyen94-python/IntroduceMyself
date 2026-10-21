import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { countRows, deleteRows, insertMany, type TableName } from "@/lib/data/table-store";
import { demoAssets, demoChanges, demoCycleTimes, demoDays, demoEightDs, demoWindow, type DemoWindow } from "@/lib/smt/demo";
import { demoTeam } from "@/lib/smt/demo-team";
import { readDemoMeta, writeDemoMeta } from "@/lib/smt/demo-meta";
import { addDays } from "@/lib/smt/types";

// Tạo / xoá dữ liệu DEMO trong database (Admin → SMT → Dữ liệu demo).
// Chia thành nhiều bước nhỏ (danh mục + từng tháng) để mỗi request chạy nhanh, không bị timeout trên Vercel.
// Mọi dòng ghi ở đây đều có is_demo = true; xoá cũng chỉ xoá is_demo = true -> không chạm dữ liệu thật.

export const DEMO_TABLES: TableName[] = [
  "smt_task_updates",
  "smt_tasks",
  "smt_engineers",
  "smt_asset_logs",
  "smt_assets",
  "smt_production_logs",
  "smt_defect_logs",
  "smt_cycle_times",
  "smt_4m_changes",
  "smt_8d_reports"
];

const DEMO = { is_demo: true } as const;

export function demoSteps(win: DemoWindow) {
  const months: string[] = [];
  for (let m = win.from.slice(0, 7); m <= win.to.slice(0, 7); m = addDays(`${m}-01`, 32).slice(0, 7)) months.push(m);
  return ["masters", ...months];
}

export async function clearDemo() {
  await writeDemoMeta(null);
  for (const table of DEMO_TABLES) await deleteRows(table, DEMO);
}

export async function startDemo(today?: string) {
  await clearDemo();
  const win = demoWindow(today);
  return { window: win, steps: demoSteps(win) };
}

export async function runDemoStep(win: DemoWindow, step: string) {
  const now = new Date().toISOString();
  const mark = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, ...DEMO, updated_at: now }));
  if (step === "masters") {
    const { assets } = demoAssets(win);
    const changes = demoChanges(win);
    const eightD = demoEightDs(win);
    const team = demoTeam(win, { eightD, changes });
    let n = 0;
    n += await insertMany("smt_assets", mark(assets));
    n += await insertMany("smt_cycle_times", mark(demoCycleTimes(win)));
    n += await insertMany("smt_4m_changes", mark(changes));
    n += await insertMany("smt_8d_reports", mark(eightD));
    n += await insertMany("smt_engineers", mark(team.engineers));
    n += await insertMany("smt_tasks", mark(team.tasks));
    n += await insertMany("smt_task_updates", mark(team.updates));
    return n;
  }
  if (!/^\d{4}-\d{2}$/.test(step)) throw new Error(`Bước không hợp lệ: ${step}`);
  const from = `${step}-01`;
  const to = addDays(addDays(from, 32).slice(0, 7) + "-01", -1);
  const { production, defects } = demoDays(win, from, to);
  const logs = demoAssets(win).logs.filter((l) => l.log_date >= from && l.log_date <= to);
  return (await insertMany("smt_production_logs", mark(production))) + (await insertMany("smt_defect_logs", mark(defects))) + (await insertMany("smt_asset_logs", mark(logs)));
}

export async function finishDemo(win: DemoWindow) {
  const counts: Record<string, number> = {};
  for (const table of DEMO_TABLES) counts[table] = await countRows(table, DEMO);
  const meta = { ...win, seededAt: new Date().toISOString(), complete: true, counts };
  await writeDemoMeta(meta);
  return meta;
}

export { readDemoMeta };

// ---------- Dung lượng database ----------
export type StorageStats = {
  source: "supabase" | "local";
  databaseBytes: number;
  // Gói Free của Supabase: 500 MB / project.
  limitBytes: number;
  tables: Array<{ table: string; rows: number; bytes: number; demoRows?: number }>;
};

export const FREE_LIMIT_BYTES = 500 * 1024 * 1024;

export async function readStorageStats(): Promise<StorageStats> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("db_table_sizes");
    if (error) throw new Error(`Không đọc được dung lượng (đã chạy migration 202610240001 chưa?): ${error.message}`);
    const rows = (data ?? []) as Array<{ table_name: string; row_estimate: number; total_bytes: number }>;
    const db = rows.find((r) => r.table_name === "__database__");
    return {
      source: "supabase",
      databaseBytes: Number(db?.total_bytes ?? 0),
      limitBytes: FREE_LIMIT_BYTES,
      tables: rows
        .filter((r) => r.table_name !== "__database__")
        .map((r) => ({ table: r.table_name, rows: Number(r.row_estimate), bytes: Number(r.total_bytes) }))
        .sort((a, b) => b.bytes - a.bytes)
    };
  }
  // Local: ước lượng theo kích thước JSON (Postgres thường lớn hơn ~1.5-2 lần do chỉ mục).
  const file = path.join(process.cwd(), ".data", "dev-db.json");
  let db: Record<string, unknown[]> = {};
  let size = 0;
  try {
    const raw = await fs.readFile(file, "utf-8");
    size = raw.length;
    db = JSON.parse(raw) as Record<string, unknown[]>;
  } catch {
    // chưa có file
  }
  return {
    source: "local",
    databaseBytes: size,
    limitBytes: FREE_LIMIT_BYTES,
    tables: Object.entries(db)
      .map(([table, rows]) => ({ table, rows: rows.length, bytes: JSON.stringify(rows).length }))
      .sort((a, b) => b.bytes - a.bytes)
  };
}
