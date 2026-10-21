import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Truy cập bảng đơn giản cho thống kê / chat / hỏi đáp / cửa hàng / báo cáo SMT.
//  - Có Supabase: dùng bảng thật (supabase/migrations/202610190001_engagement_analytics_chat.sql).
//  - Local không có Supabase: lưu tạm vào .data/dev-db.json (đã gitignore) để test được ngay.
//  - Production không có Supabase: báo lỗi (không âm thầm ghi file trên serverless).

export type TableName =
  | "analytics_visits"
  | "firmware_flash_events"
  | "chat_conversations"
  | "chat_messages"
  | "doc_comments"
  | "shop_products"
  | "shop_orders"
  | "smt_production_logs"
  | "smt_defect_logs"
  | "smt_cycle_times"
  | "smt_8d_reports"
  | "smt_4m_changes"
  | "smt_assets"
  | "smt_asset_logs"
  | "smt_handbook"
  | "smt_engineers"
  | "smt_tasks"
  | "smt_task_updates";

type Row = Record<string, unknown> & { id: string; created_at: string };

export type Query = {
  eq?: Record<string, string | number | boolean | null>;
  in?: [string, string[]];
  gte?: [string, string];
  gt?: [string, string];
  lte?: [string, string];
  order?: [string, "asc" | "desc"];
  limit?: number;
  columns?: string;
};

export class StorageUnavailableError extends Error {}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export function isStorageAvailable() {
  return Boolean(getSupabaseServerClient()) || !isProductionRuntime();
}

// ---------- Dev JSON fallback ----------
const DEV_FILE = path.join(process.cwd(), ".data", "dev-db.json");
let devQueue: Promise<unknown> = Promise.resolve();

async function readDev(): Promise<Record<string, Row[]>> {
  try {
    return JSON.parse(await fs.readFile(DEV_FILE, "utf-8")) as Record<string, Row[]>;
  } catch {
    return {};
  }
}

// Ghi tuần tự để tránh 2 request ghi đè nhau.
function withDev<T>(fn: (db: Record<string, Row[]>) => T | Promise<T>, write: boolean): Promise<T> {
  const run = devQueue.then(async () => {
    const db = await readDev();
    const result = await fn(db);
    if (write) {
      await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
      await fs.writeFile(DEV_FILE, JSON.stringify(db), "utf-8");
    }
    return result;
  });
  devQueue = run.catch(() => undefined);
  return run;
}

// Cột boolean thêm sau (vd is_demo) không có trong dòng cũ của file dev -> coi là false như default của DB.
function matches(row: Row, q: Query) {
  if (q.eq) for (const [k, v] of Object.entries(q.eq)) if ((row[k] ?? (typeof v === "boolean" ? false : null)) !== v) return false;
  if (q.in && !q.in[1].includes(String(row[q.in[0]]))) return false;
  if (q.gte && !(String(row[q.gte[0]] ?? "") >= q.gte[1])) return false;
  if (q.gt && !(String(row[q.gt[0]] ?? "") > q.gt[1])) return false;
  if (q.lte && !(String(row[q.lte[0]] ?? "") <= q.lte[1])) return false;
  return true;
}

function sortRows(rows: Row[], q: Query) {
  if (!q.order) return rows;
  const [col, dir] = q.order;
  return [...rows].sort((a, b) => {
    const x = a[col] as string | number;
    const y = b[col] as string | number;
    return (x < y ? -1 : x > y ? 1 : 0) * (dir === "asc" ? 1 : -1);
  });
}

// ---------- API ----------
function client() {
  const supabase = getSupabaseServerClient();
  if (!supabase && isProductionRuntime()) throw new StorageUnavailableError("Supabase chưa được cấu hình.");
  return supabase;
}

export async function insertRow<T extends object>(table: TableName, row: T): Promise<T & Row> {
  const supabase = client();
  if (supabase) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw new Error(`[${table}] insert: ${error.message}`);
    return data as T & Row;
  }
  return withDev((db) => {
    const full = { id: randomUUID(), created_at: new Date().toISOString(), ...row } as T & Row;
    (db[table] ??= []).push(full);
    return full;
  }, true);
}

// PostgREST của Supabase trả tối đa 1.000 dòng / request -> limit lớn hơn thì đọc nhiều trang song song.
const PAGE = 1000;

export async function selectRows<T = Row>(table: TableName, q: Query = {}): Promise<T[]> {
  const supabase = client();
  const limit = q.limit ?? 1000;
  if (supabase) {
    const build = (count: boolean) => {
      let query = supabase.from(table).select(q.columns ?? "*", count ? { count: "exact" } : undefined);
      if (q.eq) for (const [k, v] of Object.entries(q.eq)) query = v === null ? query.is(k, null) : query.eq(k, v);
      if (q.in) query = query.in(q.in[0], q.in[1]);
      if (q.gte) query = query.gte(q.gte[0], q.gte[1]);
      if (q.gt) query = query.gt(q.gt[0], q.gt[1]);
      if (q.lte) query = query.lte(q.lte[0], q.lte[1]);
      // Thêm id để thứ tự giữa các trang ổn định (không trùng / sót dòng cùng ngày).
      if (q.order) query = query.order(q.order[0], { ascending: q.order[1] === "asc" }).order("id");
      return query;
    };
    const first = await build(limit > PAGE).range(0, Math.min(limit, PAGE) - 1);
    if (first.error) throw new Error(`[${table}] select: ${first.error.message}`);
    const rows = (first.data ?? []) as T[];
    const total = Math.min(limit, first.count ?? rows.length);
    if (total <= rows.length) return rows;
    const pages = await Promise.all(
      Array.from({ length: Math.ceil((total - PAGE) / PAGE) }, (_, i) => build(false).range(PAGE * (i + 1), Math.min(total, PAGE * (i + 2)) - 1))
    );
    for (const page of pages) {
      if (page.error) throw new Error(`[${table}] select: ${page.error.message}`);
      rows.push(...((page.data ?? []) as T[]));
    }
    return rows;
  }
  return withDev((db) => sortRows((db[table] ?? []).filter((r) => matches(r, q)), q).slice(0, limit) as T[], false);
}

// Ghi nhiều dòng một lần (nhập Excel, tạo dữ liệu demo). Không trả dữ liệu về để nhẹ request.
export async function insertMany(table: TableName, rows: Array<Record<string, unknown>>): Promise<number> {
  if (!rows.length) return 0;
  const supabase = client();
  if (supabase) {
    for (let i = 0; i < rows.length; i += PAGE) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + PAGE));
      if (error) throw new Error(`[${table}] insert: ${error.message}`);
    }
    return rows.length;
  }
  return withDev((db) => {
    const now = new Date().toISOString();
    (db[table] ??= []).push(...rows.map((r) => ({ id: randomUUID(), created_at: now, ...r }) as Row));
    return rows.length;
  }, true);
}

// Đếm số dòng khớp (không tải dữ liệu).
export async function countRows(table: TableName, eq: Record<string, string | number | boolean> = {}): Promise<number> {
  const supabase = client();
  if (supabase) {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    for (const [k, v] of Object.entries(eq)) query = query.eq(k, v);
    const { count, error } = await query;
    if (error) throw new Error(`[${table}] count: ${error.message}`);
    return count ?? 0;
  }
  return withDev((db) => (db[table] ?? []).filter((r) => matches(r, { eq })).length, false);
}

export async function getRow<T = Row>(table: TableName, id: string): Promise<T | null> {
  const rows = await selectRows<T>(table, { eq: { id }, limit: 1 });
  return rows[0] ?? null;
}

// Cập nhật các dòng khớp `eq`. Trả về số dòng đã cập nhật.
export async function updateRows(table: TableName, eq: Record<string, string | number | boolean>, patch: Record<string, unknown>): Promise<number> {
  const supabase = client();
  if (supabase) {
    let query = supabase.from(table).update(patch);
    for (const [k, v] of Object.entries(eq)) query = query.eq(k, v);
    const { data, error } = await query.select("id");
    if (error) throw new Error(`[${table}] update: ${error.message}`);
    return data?.length ?? 0;
  }
  return withDev((db) => {
    let count = 0;
    for (const row of db[table] ?? []) {
      if (matches(row, { eq })) {
        Object.assign(row, patch);
        count += 1;
      }
    }
    return count;
  }, true);
}

export async function deleteRows(table: TableName, eq: Record<string, string | boolean>): Promise<void> {
  const supabase = client();
  if (supabase) {
    let query = supabase.from(table).delete();
    for (const [k, v] of Object.entries(eq)) query = query.eq(k, v);
    const { error } = await query;
    if (error) throw new Error(`[${table}] delete: ${error.message}`);
    return;
  }
  await withDev((db) => {
    db[table] = (db[table] ?? []).filter((row) => !matches(row, { eq }));
    // Mô phỏng "on delete cascade" của chat_messages / doc_comments con.
    if (table === "chat_conversations" && eq.id) db.chat_messages = (db.chat_messages ?? []).filter((m) => m.conversation_id !== eq.id);
    if (table === "doc_comments" && eq.id) db.doc_comments = (db.doc_comments ?? []).filter((c) => c.parent_id !== eq.id);
    if (table === "smt_assets" && eq.id) db.smt_asset_logs = (db.smt_asset_logs ?? []).filter((l) => l.asset_id !== eq.id);
    if (table === "smt_tasks" && eq.id) db.smt_task_updates = (db.smt_task_updates ?? []).filter((u) => u.task_id !== eq.id);
    if (table === "smt_engineers" && eq.id) for (const t of db.smt_tasks ?? []) if (t.assignee_id === eq.id) t.assignee_id = null;
  }, true);
}
