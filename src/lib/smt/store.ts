import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertReadable } from "@/lib/supabase/strict-read";
import { StorageUnavailableError, deleteRows, getRow, insertRow, selectRows, updateRows, type Query } from "@/lib/data/table-store";
import { DEFAULT_SMT_SETTINGS } from "@/lib/smt/defaults";
import { buildDemoBundle } from "@/lib/smt/demo";
import { DEMO_SMT_SETTINGS } from "@/lib/smt/demo-config";
import { readDemoMeta } from "@/lib/smt/demo-meta";
import { normalizeModules } from "@/lib/smt/modules";
import { DATASETS, SmtValidationError, normalizeRow, type DatasetKey } from "@/lib/smt/datasets";
import { addDays, emptyEightDContent, todayVn, SMT_PROCESSES } from "@/lib/smt/types";
import type { EightDContent, EightDReport, SmtDataBundle, SmtSettings } from "@/lib/smt/types";

// Dữ liệu SMT: 7 bảng smt_* (Supabase) hoặc .data/dev-db.json khi chạy local không có Supabase.
// Cài đặt: site_content['smt_settings'] (Supabase) hoặc .data/smt-settings.json.
// Mỗi dòng có cột is_demo: mọi hàm ở đây mặc định chỉ đọc / ghi dữ liệu THẬT (is_demo = false);
// dữ liệu demo chỉ được đọc khi truyền demo: true (xem demo-store.ts để tạo / xoá demo).

const SETTINGS_KEY = "smt_settings";
const DEV_SETTINGS_FILE = path.join(process.cwd(), ".data", "smt-settings.json");

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

type Row = Record<string, unknown> & { id: string };

// ---------- Cài đặt ----------
const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const ratio = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
};

export function normalizeSmtSettings(input: Partial<SmtSettings> | null): SmtSettings {
  const d = DEFAULT_SMT_SETTINGS;
  const s = input ?? {};
  const processIds = SMT_PROCESSES.map((p) => p.id) as string[];
  const lines = Array.isArray(s.lines)
    ? s.lines
        .map((l) => ({
          code: text(l?.code, 20).toUpperCase(),
          name: text(l?.name, 80) || text(l?.code, 20),
          stations: Array.isArray(l?.stations) ? l.stations.map((x) => text(x, 40)).filter(Boolean).slice(0, 30) : [],
          taktSec: Math.max(0, Math.min(3600, Number(l?.taktSec) || 0))
        }))
        .filter((l) => l.code)
    : d.lines;
  const catalog = Array.isArray(s.defectCatalog)
    ? s.defectCatalog
        .map((c) => ({ code: text(c?.code, 12).toUpperCase(), vi: text(c?.vi, 80), en: text(c?.en, 80), process: processIds.includes(String(c?.process)) ? (c.process as SmtSettings["defectCatalog"][number]["process"]) : "other" }))
        .filter((c) => c.code)
    : d.defectCatalog;
  const t = (s.targets ?? {}) as Partial<SmtSettings["targets"]>;
  return {
    company: text(s.company, 80) || d.company,
    lines: lines.length ? dedupe(lines, (l) => l.code) : d.lines,
    shifts: Array.isArray(s.shifts) ? s.shifts.map((x) => text(x, 20)).filter(Boolean).slice(0, 6) : d.shifts,
    defectCatalog: catalog.length ? dedupe(catalog, (c) => c.code) : d.defectCatalog,
    targets: {
      oee: ratio(t.oee, d.targets.oee),
      fpy: ratio(t.fpy, d.targets.fpy),
      availability: ratio(t.availability, d.targets.availability),
      mispickRate: ratio(t.mispickRate, d.targets.mispickRate),
      dpmo: Math.max(0, Number(t.dpmo) || d.targets.dpmo)
    },
    publicSource: s.publicSource === "live" ? "live" : "demo",
    publicDays: Math.max(7, Math.min(180, Math.round(Number(s.publicDays) || d.publicDays))),
    modules: normalizeModules(s.modules),
    modulesInDemo: Boolean(s.modulesInDemo)
  };
}

function dedupe<T>(items: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

export async function readSmtSettings(): Promise<SmtSettings> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", SETTINGS_KEY).maybeSingle();
    assertReadable("site_content/smt_settings", supabase, error);
    return normalizeSmtSettings((data?.payload as Partial<SmtSettings>) ?? null);
  }
  assertReadable("site_content/smt_settings", supabase);
  try {
    return normalizeSmtSettings(JSON.parse(await fs.readFile(DEV_SETTINGS_FILE, "utf-8")) as Partial<SmtSettings>);
  } catch {
    return normalizeSmtSettings(null);
  }
}

export async function writeSmtSettings(input: Partial<SmtSettings>) {
  const settings = normalizeSmtSettings(input);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase
      .from("site_content")
      .upsert({ config_key: SETTINGS_KEY, payload: settings, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    if (error) throw new Error(`Lưu cài đặt SMT thất bại: ${error.message}`);
    return settings;
  }
  if (isProductionRuntime()) throw new StorageUnavailableError("Supabase chưa được cấu hình.");
  await fs.mkdir(path.dirname(DEV_SETTINGS_FILE), { recursive: true });
  await fs.writeFile(DEV_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}

// ---------- Bộ dữ liệu ----------
export type ListOptions = { from?: string; to?: string; line?: string; limit?: number; demo?: boolean };

const LIVE = { is_demo: false } as const;

// Supabase trả numeric dạng number; riêng dev JSON có thể là chuỗi -> ép kiểu lại cho chắc.
function coerce(key: DatasetKey, row: Row): Row {
  const out: Row = { ...row };
  for (const f of DATASETS[key].fields) {
    if ((f.type === "number" || f.type === "int") && out[f.key] !== undefined) out[f.key] = Number(out[f.key]) || 0;
    if (f.type === "date" && typeof out[f.key] === "string") out[f.key] = (out[f.key] as string).slice(0, 10);
    if (f.type === "json" && key === "8d") out[f.key] = normalizeEightDContent(out[f.key]);
  }
  return out;
}

export async function listDataset<T = Row>(key: DatasetKey, opt: ListOptions = {}): Promise<T[]> {
  const def = DATASETS[key];
  const q: Query = { order: [def.dateField, "desc"], limit: opt.limit ?? 5000, eq: { is_demo: Boolean(opt.demo) } };
  if (opt.from) q.gte = [def.dateField, opt.from];
  if (opt.to) q.lte = [def.dateField, opt.to];
  if (opt.line && def.fields.some((f) => f.key === "line")) q.eq!.line = opt.line;
  // Danh mục thiết bị: không lọc theo ngày PM (thiết bị chưa PM vẫn phải hiện).
  if (key === "assets") {
    delete q.gte;
    delete q.lte;
    q.order = ["code", "asc"];
  }
  const rows = await selectRows<Row>(def.table, q);
  return rows.map((r) => coerce(key, r)) as T[];
}

async function prepare(key: DatasetKey, input: Record<string, unknown>, partial: boolean, currentId?: string) {
  const def = DATASETS[key];
  const settings = await readSmtSettings();
  const row = normalizeRow(def, input, partial);

  if (key === "defects" && (row.process === "" || (!partial && !row.process))) {
    row.process = settings.defectCatalog.find((d) => d.code === row.defect_code)?.process ?? "other";
  }
  if (key === "defects" && typeof row.defect_code === "string") row.defect_code = row.defect_code.toUpperCase();
  if (key === "asset-logs" && typeof row.asset_id === "string") row.asset_id = await resolveAssetId(row.asset_id);
  if (key === "assets" && typeof row.code === "string") {
    row.code = row.code.toUpperCase();
    const dup = await selectRows<Row>("smt_assets", { eq: { code: row.code as string, ...LIVE }, limit: 1 });
    if (dup[0] && dup[0].id !== currentId) throw new SmtValidationError(`Mã thiết bị "${row.code}" đã tồn tại.`);
  }
  if (key === "8d") {
    if ("content" in row) row.content = normalizeEightDContent(row.content);
    if (!partial && !row.code) row.code = await nextCode("smt_8d_reports", "8D", String(row.opened_on ?? todayVn()));
    if (row.code) {
      const dup = await selectRows<Row>("smt_8d_reports", { eq: { code: row.code as string, ...LIVE }, limit: 1 });
      if (dup[0] && dup[0].id !== currentId) throw new SmtValidationError(`Mã 8D "${row.code}" đã tồn tại.`);
    }
    if (row.status === "closed" && !row.closed_on && !partial) row.closed_on = todayVn();
  }
  if (key === "changes" && !partial && !row.code) row.code = await nextCode("smt_4m_changes", "4M", String(row.change_date ?? todayVn()));
  return row;
}

// Cho phép nhập mã feeder (FD-001) thay vì id khi dán từ Excel.
async function resolveAssetId(value: string) {
  const byId = await selectRows<Row>("smt_assets", { eq: { id: value, ...LIVE }, limit: 1 }).catch(() => []);
  if (byId[0]) return value;
  const byCode = await selectRows<Row>("smt_assets", { eq: { code: value.toUpperCase(), ...LIVE }, limit: 1 });
  if (byCode[0]) return byCode[0].id;
  throw new SmtValidationError(`Không tìm thấy feeder / nozzle "${value}". Thêm vào Danh mục trước.`);
}

async function nextCode(table: "smt_8d_reports" | "smt_4m_changes", prefix: string, date: string) {
  const stem = `${prefix}-${date.slice(2, 4)}${date.slice(5, 7)}-`;
  const rows = await selectRows<{ code: string }>(table, { columns: "code", eq: LIVE, limit: 5000 });
  const max = rows.filter((r) => r.code?.startsWith(stem)).reduce((m, r) => Math.max(m, Number(r.code.slice(stem.length)) || 0), 0);
  return `${stem}${String(max + 1).padStart(2, "0")}`;
}

export async function insertDatasetRows(key: DatasetKey, inputs: Array<Record<string, unknown>>, author = "") {
  if (!inputs.length) return [];
  if (inputs.length > 2000) throw new SmtValidationError("Tối đa 2.000 dòng mỗi lần nhập.");
  // Kiểm tra hết trước rồi mới ghi: 1 dòng lỗi thì không ghi dòng nào (báo đúng số dòng).
  const prepared: Array<Record<string, unknown>> = [];
  for (let i = 0; i < inputs.length; i++) {
    try {
      prepared.push(await prepare(key, inputs[i], false));
    } catch (e) {
      if (e instanceof SmtValidationError && inputs.length > 1) throw new SmtValidationError(`Dòng ${i + 1}: ${e.message}`);
      throw e;
    }
  }
  const now = new Date().toISOString();
  const out: Row[] = [];
  for (const row of prepared) out.push(coerce(key, (await insertRow(DATASETS[key].table, { ...row, created_by: author, updated_by: author, updated_at: now })) as Row));
  return out;
}

export async function updateDatasetRow(key: DatasetKey, id: string, patch: Record<string, unknown>, author = "") {
  const row = await prepare(key, patch, true, id);
  const count = await updateRows(DATASETS[key].table, { id, ...LIVE }, { ...row, updated_by: author, updated_at: new Date().toISOString() });
  if (!count) return null;
  const fresh = await getRow<Row>(DATASETS[key].table, id);
  return fresh ? coerce(key, fresh) : null;
}

export async function deleteDatasetRow(key: DatasetKey, id: string) {
  await deleteRows(DATASETS[key].table, { id, ...LIVE });
}

// Chỉ 8D thật (trang soạn 8D của Admin / Trợ lý không mở được bản demo).
export async function getEightD(id: string): Promise<EightDReport | null> {
  const row = await getRow<Row>("smt_8d_reports", id);
  return row && !row.is_demo ? (coerce("8d", row) as unknown as EightDReport) : null;
}

// ---------- 8D content ----------
const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const strList = (v: unknown, max = 30) => (Array.isArray(v) ? v.map((x) => str(x, 500)).slice(0, max) : []);
const actionList = (v: unknown) =>
  (Array.isArray(v) ? v : []).slice(0, 30).map((a) => {
    const x = (a ?? {}) as Record<string, unknown>;
    return { action: str(x.action, 500), owner: str(x.owner, 80), due: str(x.due, 10), status: x.status === "done" ? ("done" as const) : ("open" as const), result: str(x.result, 500) };
  });

export function normalizeEightDContent(input: unknown): EightDContent {
  const base = emptyEightDContent();
  const c = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof EightDContent, Record<string, unknown>>>;
  const pick = <K extends keyof EightDContent>(k: K) => (c[k] ?? {}) as Record<string, unknown>;
  const fill = <T extends Record<string, string>>(target: T, source: Record<string, unknown>) => {
    for (const key of Object.keys(target)) (target as Record<string, string>)[key] = str(source[key]);
    return target;
  };
  const d4 = pick("d4");
  const fb = (d4.fishbone ?? {}) as Record<string, unknown>;
  const fiveWhy = (v: unknown) => {
    const list = strList(v, 7);
    while (list.length < 5) list.push("");
    return list;
  };
  return {
    d0: fill(base.d0, pick("d0")),
    d1: {
      team: (Array.isArray(pick("d1").team) ? (pick("d1").team as unknown[]) : []).slice(0, 20).map((m) => {
        const x = (m ?? {}) as Record<string, unknown>;
        return { name: str(x.name, 80), role: str(x.role, 80), dept: str(x.dept, 80) };
      })
    },
    d2: fill(base.d2, pick("d2")),
    d3: { actions: actionList(pick("d3").actions), stockCheck: str(pick("d3").stockCheck) },
    d4: {
      fishbone: {
        man: strList(fb.man),
        machine: strList(fb.machine),
        material: strList(fb.material),
        method: strList(fb.method),
        measurement: strList(fb.measurement),
        environment: strList(fb.environment)
      },
      whyOccur: fiveWhy(d4.whyOccur),
      whyEscape: fiveWhy(d4.whyEscape),
      rootOccur: str(d4.rootOccur),
      rootEscape: str(d4.rootEscape),
      verification: str(d4.verification)
    },
    d5: { actions: actionList(pick("d5").actions) },
    d6: { actions: actionList(pick("d6").actions), effectiveness: str(pick("d6").effectiveness) },
    d7: { actions: actionList(pick("d7").actions), documents: strList(pick("d7").documents) },
    d8: fill(base.d8, pick("d8"))
  };
}

// ---------- Gói dữ liệu cho báo cáo ----------
export async function loadBundle(opt: { from: string; to: string; demo?: boolean }): Promise<SmtDataBundle> {
  const demo = Boolean(opt.demo);
  const range = { from: opt.from, to: opt.to, demo, limit: 50_000 };
  const [production, defects, cycleTimes, changes, assets, assetLogs, eightD] = await Promise.all([
    listDataset("production", range),
    listDataset("defects", range),
    // Line balance lấy lần đo mới nhất, kể cả trước kỳ báo cáo.
    listDataset("cycle-times", { to: opt.to, demo }),
    listDataset("changes", range),
    listDataset("assets", { demo }),
    // Đủ để biết lần PM gần nhất (chu kỳ PM dài nhất thường 90-180 ngày).
    listDataset("asset-logs", { from: addDays(opt.from, -200), to: opt.to, demo, limit: 50_000 }),
    listDataset("8d", { limit: 500, demo })
  ]);
  return { production, defects, cycleTimes, changes, assets, assetLogs, eightD } as unknown as SmtDataBundle;
}

// Dữ liệu cho trang công khai:
//  - "demo": dữ liệu demo (bản trong database nếu admin đã tạo, nếu chưa thì tính tạm trong bộ nhớ).
//  - "live": số liệu thật nhưng bỏ ghi chú / work order / nguyên nhân, 8D & 4M chỉ lấy bản ghi is_public.
// Trả kèm settings vì demo dùng cấu hình 10 line riêng (demo-config.ts), không phải line thật.
export async function loadPublicBundle(settings: SmtSettings): Promise<{ bundle: SmtDataBundle; settings: SmtSettings; source: "demo" | "live"; from: string; to: string }> {
  if (settings.publicSource !== "live") return loadDemoView(settings.publicDays);
  const to = todayVn();
  const from = addDays(to, -(settings.publicDays - 1));
  try {
    return { bundle: sanitizeBundle(await loadBundle({ from, to })), settings, source: "live", from, to };
  } catch (error) {
    console.error("[smt] public live data failed, fallback demo:", error);
    return loadDemoView(settings.publicDays);
  }
}

export function sanitizeBundle(b: SmtDataBundle): SmtDataBundle {
  return {
    production: b.production.map((p) => ({ ...p, work_order: "", note: "" })),
    defects: b.defects.map((d) => ({ ...d, part_no: "", root_cause: "", action: "" })),
    cycleTimes: b.cycleTimes.map((c) => ({ ...c, note: "" })),
    changes: b.changes.filter((c) => c.is_public).map((c) => ({ ...c, owner: "", approved_by: "", note: "" })),
    assets: b.assets.map((a) => ({ ...a, note: "" })),
    assetLogs: b.assetLogs.map((l) => ({ ...l, technician: "", note: "" })),
    eightD: b.eightD.filter((r) => r.is_public)
  };
}

// Kỳ demo kết thúc ở ngày tạo demo (không phải hôm nay) để biểu đồ không bị trống ở cuối.
export async function loadDemoView(days: number): Promise<{ bundle: SmtDataBundle; settings: SmtSettings; source: "demo"; from: string; to: string }> {
  const meta = await readDemoMeta();
  const to = meta?.to ?? todayVn();
  const from = addDays(to, -(days - 1));
  const settings = { ...DEMO_SMT_SETTINGS, publicDays: days };
  if (meta) {
    try {
      return { bundle: await loadBundle({ from, to, demo: true }), settings, source: "demo", from, to };
    } catch (error) {
      console.error("[smt] demo data in DB failed, fallback memory:", error);
    }
  }
  return { bundle: buildDemoBundle(days, to), settings, source: "demo", from, to };
}
