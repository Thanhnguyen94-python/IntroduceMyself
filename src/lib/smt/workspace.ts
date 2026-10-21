import { cache } from "react";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { selectRows } from "@/lib/data/table-store";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";
import { demoAssets, demoChanges, demoCycleTimes, demoDays, demoEightDs, demoWindow } from "@/lib/smt/demo";
import { DEMO_SMT_SETTINGS } from "@/lib/smt/demo-config";
import { readDemoMeta, type DemoMeta } from "@/lib/smt/demo-meta";
import { demoTeam } from "@/lib/smt/demo-team";
import { listDataset, loadBundle, readSmtSettings, sanitizeBundle } from "@/lib/smt/store";
import { SMT_MODE_COOKIE, type SmtMode } from "@/lib/smt/mode";
import { addDays, todayVn } from "@/lib/smt/types";
import type { Asset, AssetLog, ChangeLog, CycleTime, DefectLog, EightDReport, ProductionLog, SmtDataBundle, SmtSettings } from "@/lib/smt/types";
import type { Engineer, Task, TaskUpdate } from "@/lib/smt/team-types";

// Bối cảnh của mỗi lượt xem /smt. Chế độ Demo / Thực tế lưu trong cookie CỦA TRÌNH DUYỆT người xem,
// nên bạn chuyển sang Demo để học / thử không làm thay đổi gì với người khác đang xem.
//  - Khách: mặc định theo Cài đặt SMT → "Trang công khai dùng dữ liệu" (demo / live).
//           Chỉ xem được Thực tế khi bạn bật "live", và chỉ là số liệu tổng hợp (đã bỏ ghi chú, WO...).
//  - Admin: mặc định Thực tế, xem được toàn bộ, sửa được công việc ở cả 2 chế độ
//           (sửa ở Demo chỉ ghi vào dòng is_demo = true -> "sân tập" an toàn).

export const WORKSPACE_KEY = "smt-workspace";

export type WorkspaceCtx = {
  mode: SmtMode;
  demo: boolean;
  isAdmin: boolean;
  enabled: boolean;
  open: boolean;
  liveAllowed: boolean;
  forcedDemo: boolean;
  settings: SmtSettings;
  liveSettings: SmtSettings;
  meta: DemoMeta | null;
  // "Hôm nay" của bộ dữ liệu: demo dừng ở ngày tạo demo.
  today: string;
  // Demo đã lưu trong DB? (chưa -> tính tạm trong bộ nhớ, không sửa được)
  stored: boolean;
  canEdit: boolean;
};

// cache(): layout + page trong cùng 1 request chỉ đọc cookie / cài đặt 1 lần.
export const workspaceContext = cache(async (): Promise<WorkspaceCtx> => {
  const [isAdmin, liveSettings, visibility, meta, jar] = await Promise.all([isAdminRequest(), readSmtSettings(), readSiteVisibility(), readDemoMeta(), cookies()]);
  const enabled = isPageEnabled(visibility, WORKSPACE_KEY);
  const liveAllowed = isAdmin || liveSettings.publicSource === "live";
  const cookie = jar.get(SMT_MODE_COOKIE)?.value;
  let mode: SmtMode = cookie === "demo" || cookie === "live" ? cookie : isAdmin ? "live" : liveSettings.publicSource;
  const forcedDemo = mode === "live" && !liveAllowed;
  if (forcedDemo) mode = "demo";
  const demo = mode === "demo";
  const stored = demo ? Boolean(meta) : true;
  return {
    mode,
    demo,
    isAdmin,
    enabled,
    open: enabled || isAdmin,
    liveAllowed,
    forcedDemo,
    settings: demo ? DEMO_SMT_SETTINGS : liveSettings,
    liveSettings,
    meta,
    today: demo ? (meta?.to ?? todayVn()) : todayVn(),
    stored,
    canEdit: isAdmin && stored
  };
});

// ---------- Sản xuất ----------
const memoryWindow = (ctx: WorkspaceCtx) => demoWindow(ctx.today);

export async function loadProduction(ctx: WorkspaceCtx, from: string, to: string, line?: string): Promise<ProductionLog[]> {
  if (ctx.demo && !ctx.stored) {
    let seq = 0;
    return demoDays(memoryWindow(ctx), from, to)
      .production.filter((p) => !line || p.line === line)
      .map((p) => ({ id: `m-${++seq}`, ...p }));
  }
  const rows = await listDataset<ProductionLog>("production", { from, to, line, demo: ctx.demo, limit: 50_000 });
  return ctx.isAdmin ? rows : rows.map((p) => ({ ...p, work_order: "", note: "" }));
}

// Lỗi tổng hợp theo (line, tháng, mã lỗi, công đoạn, trạm phát hiện): nhỏ gọn cho dashboard nhiều tháng.
export type DefectSummary = { line: string; month: string; defect_code: string; process: string; detected_by: string; qty: number };

function summarize(rows: Array<Pick<DefectLog, "line" | "log_date" | "defect_code" | "process" | "detected_by" | "qty">>): DefectSummary[] {
  const map = new Map<string, DefectSummary>();
  for (const d of rows) {
    const month = d.log_date.slice(0, 7);
    const key = `${d.line}|${month}|${d.defect_code}|${d.process}|${d.detected_by}`;
    const cur = map.get(key);
    if (cur) cur.qty += d.qty;
    else map.set(key, { line: d.line, month, defect_code: d.defect_code, process: d.process, detected_by: d.detected_by, qty: d.qty });
  }
  return [...map.values()];
}

export async function loadDefectSummary(ctx: WorkspaceCtx, from: string, to: string): Promise<DefectSummary[]> {
  if (ctx.demo && !ctx.stored) return summarize(demoDays(memoryWindow(ctx), from, to).defects);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("smt_defect_summary", { p_demo: ctx.demo, p_from: from, p_to: to });
    if (!error) return ((data ?? []) as DefectSummary[]).map((r) => ({ ...r, qty: Number(r.qty) }));
    console.error("[smt] defect summary rpc failed, fallback select:", error.message);
  }
  return summarize(await listDataset<DefectLog>("defects", { from, to, demo: ctx.demo, limit: 100_000 }));
}

export async function loadDefects(ctx: WorkspaceCtx, from: string, to: string, line?: string): Promise<DefectLog[]> {
  if (ctx.demo && !ctx.stored) {
    let seq = 0;
    return demoDays(memoryWindow(ctx), from, to)
      .defects.filter((d) => !line || d.line === line)
      .map((d) => ({ id: `m-${++seq}`, ...d }));
  }
  const rows = await listDataset<DefectLog>("defects", { from, to, line, demo: ctx.demo, limit: 50_000 });
  return ctx.isAdmin ? rows : rows.map((d) => ({ ...d, part_no: "", root_cause: "", action: "" }));
}

// Gói dữ liệu cho 5 mẫu báo cáo (cùng định dạng trang Tài liệu).
export async function loadReportBundle(ctx: WorkspaceCtx, from: string, to: string): Promise<SmtDataBundle> {
  if (ctx.demo && !ctx.stored) {
    const win = memoryWindow(ctx);
    const { production, defects } = demoDays(win, from, to);
    const { assets, logs } = demoAssets(win);
    let seq = 0;
    return {
      production: production.map((p) => ({ id: `m-${++seq}`, ...p })),
      defects: defects.map((d) => ({ id: `m-${++seq}`, ...d })),
      cycleTimes: demoCycleTimes(win).map((c) => ({ id: `m-${++seq}`, ...c })),
      changes: demoChanges(win),
      assets,
      assetLogs: logs.filter((l) => l.log_date >= addDays(from, -200) && l.log_date <= to),
      eightD: demoEightDs(win)
    };
  }
  const bundle = await loadBundle({ from, to, demo: ctx.demo });
  return ctx.isAdmin ? bundle : sanitizeBundle(bundle);
}

// ---------- Đội ngũ & công việc ----------
export type TeamData = { engineers: Engineer[]; tasks: Task[]; updates: TaskUpdate[] };

export async function loadTeam(ctx: WorkspaceCtx): Promise<TeamData> {
  if (ctx.demo && !ctx.stored) {
    const win = memoryWindow(ctx);
    return demoTeam(win, { eightD: demoEightDs(win), changes: demoChanges(win) });
  }
  const eq = { is_demo: ctx.demo };
  const [engineers, tasks, updates] = await Promise.all([
    selectRows<Engineer>("smt_engineers", { eq, order: ["code", "asc"], limit: 500 }),
    selectRows<Task>("smt_tasks", { eq, order: ["assigned_on", "desc"], limit: 20_000 }),
    selectRows<TaskUpdate>("smt_task_updates", { eq, order: ["at", "desc"], limit: 50_000 })
  ]);
  const num = (v: unknown) => Number(v) || 0;
  const day = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : null);
  return {
    engineers: engineers.map((e) => ({ ...e, capacity_h: num(e.capacity_h), joined_on: day(e.joined_on) })),
    tasks: tasks.map((t) => ({
      ...t,
      difficulty: num(t.difficulty) || 1,
      progress: num(t.progress),
      estimate_h: num(t.estimate_h),
      actual_h: num(t.actual_h),
      rework_count: num(t.rework_count),
      quality_score: t.quality_score === null || t.quality_score === undefined ? null : num(t.quality_score),
      assigned_on: day(t.assigned_on) ?? todayVn(),
      start_on: day(t.start_on),
      due_on: day(t.due_on),
      done_on: day(t.done_on),
      follow_up_on: day(t.follow_up_on)
    })),
    updates: updates.map((u) => ({ ...u, at: day(u.at) ?? "", hours: num(u.hours), progress: u.progress === null || u.progress === undefined ? null : num(u.progress) }))
  };
}

// ---------- Dữ liệu 1 line ----------
export async function loadLineData(ctx: WorkspaceCtx, line: string, from: string, to: string) {
  const healthFrom = addDays(to, -29);
  if (ctx.demo && !ctx.stored) {
    const win = memoryWindow(ctx);
    const { production, defects } = demoDays(win, from, to);
    const { assets, logs } = demoAssets(win);
    const mine = assets.filter((a) => a.machine.startsWith(`${line} `));
    const ids = new Set(mine.map((a) => a.id));
    let seq = 0;
    return {
      production: production.filter((p) => p.line === line).map((p) => ({ id: `m-${++seq}`, ...p })),
      defects: defects.filter((d) => d.line === line).map((d) => ({ id: `m-${++seq}`, ...d })),
      cycleTimes: demoCycleTimes(win).filter((c) => c.line === line && c.measured_on <= to).map((c) => ({ id: `m-${++seq}`, ...c })),
      assets: mine,
      assetLogs: logs.filter((l) => ids.has(l.asset_id) && l.log_date >= addDays(healthFrom, -200) && l.log_date <= to),
      changes: demoChanges(win).filter((c) => c.line === line && c.change_date <= to),
      eightD: demoEightDs(win).filter((r) => r.line === line)
    };
  }
  const demo = ctx.demo;
  const [production, defects, cycleTimes, assets, changes, eightD] = await Promise.all([
    loadProduction(ctx, from, to, line),
    loadDefects(ctx, from, to, line),
    listDataset<CycleTime>("cycle-times", { line, to, demo }),
    listDataset<Asset>("assets", { demo, limit: 20_000 }),
    listDataset<ChangeLog>("changes", { line, to, demo, limit: 500 }),
    listDataset<EightDReport>("8d", { line, demo, limit: 200 })
  ]);
  // Thiết bị thuộc line: cột "Máy" bắt đầu bằng mã line (vd "L05 · Mounter 3").
  const mine = assets.filter((a) => a.machine.toUpperCase().startsWith(line.toUpperCase()));
  const ids = new Set(mine.map((a) => a.id));
  const logs = mine.length ? (await listDataset<AssetLog>("asset-logs", { from: addDays(healthFrom, -200), to, demo, limit: 50_000 })).filter((l) => ids.has(l.asset_id)) : [];
  const open = (r: ChangeLog) => ctx.isAdmin || r.is_public;
  return {
    production,
    defects,
    cycleTimes,
    assets: mine,
    assetLogs: logs,
    changes: changes.filter(open).map((c) => (ctx.isAdmin ? c : { ...c, owner: "", approved_by: "", note: "" })),
    eightD: eightD.filter((r) => ctx.isAdmin || r.is_public)
  };
}
