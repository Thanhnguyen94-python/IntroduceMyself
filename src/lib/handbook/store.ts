import { deleteRows, getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { HANDBOOK_SEED } from "@/lib/handbook/seed";
import { HANDBOOK_CALCULATORS, HANDBOOK_CATEGORIES, type CalculatorId, type HandbookCategory, type HandbookEntry, type Threshold } from "@/lib/handbook/types";
import type { LocalizedText } from "@/lib/content/types";
import { slugify } from "@/lib/hubs/markdown";

// Sổ tay SMT: bảng smt_handbook (Supabase) hoặc .data/dev-db.json khi chạy local.
// Bảng còn trống -> dùng bộ mặc định trong code (HANDBOOK_SEED) để trang không bao giờ rỗng.

export class HandbookValidationError extends Error {}

type Row = { id: string; slug: string; category: string; sort_order: number; status: string; data: Partial<HandbookEntry>; updated_at?: string; created_at?: string };

const text = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const loc = (v: unknown, max = 300): LocalizedText => {
  const x = (v ?? {}) as Partial<LocalizedText>;
  return { vi: text(x.vi, max), en: text(x.en, max) };
};
const list = (v: unknown, max = 30, len = 120) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => text(x, len)).filter(Boolean).slice(0, max);

export function normalizeEntry(input: Partial<HandbookEntry>): HandbookEntry {
  const title = loc(input.title, 160);
  const slug = slugify(text(input.slug, 80) || title.vi);
  const category = (HANDBOOK_CATEGORIES.some((c) => c.id === input.category) ? input.category : "quality") as HandbookCategory;
  const calculator = (HANDBOOK_CALCULATORS.some((c) => c.id === input.calculator) ? input.calculator : "") as CalculatorId | "";
  const levels: Threshold["level"][] = ["good", "warning", "critical", "info"];
  return {
    id: text(input.id, 80),
    slug,
    category,
    sortOrder: Math.round(Number(input.sortOrder) || 0),
    status: input.status === "draft" ? "draft" : "published",
    title,
    symbol: text(input.symbol, 24),
    summary: loc(input.summary, 400),
    formula: text(input.formula, 1000),
    unit: text(input.unit, 60),
    thresholds: (Array.isArray(input.thresholds) ? input.thresholds : [])
      .map((t) => ({ level: levels.includes(t?.level) ? t.level : "info", range: text(t?.range, 160), meaning: text(t?.meaning, 300) }))
      .filter((t) => t.range || t.meaning)
      .slice(0, 20),
    body: loc(input.body, 30000),
    tags: list(input.tags, 20, 40),
    related: list(input.related, 12, 80).map((s) => slugify(s)),
    references: list(input.references, 12, 160),
    calculator,
    updatedAt: text(input.updatedAt, 40)
  };
}

function fromRow(row: Row): HandbookEntry {
  return normalizeEntry({ ...row.data, id: row.id, slug: row.slug, category: row.category as HandbookCategory, sortOrder: row.sort_order, status: row.status as HandbookEntry["status"], updatedAt: row.updated_at ?? row.created_at ?? "" });
}

function toRow(e: HandbookEntry) {
  const { id: _id, slug, category, sortOrder, status, updatedAt: _u, ...data } = e;
  return { slug, category, sort_order: sortOrder, status, data, updated_at: new Date().toISOString() };
}

const sortEntries = (items: HandbookEntry[]) =>
  [...items].sort((a, b) => HANDBOOK_CATEGORIES.findIndex((c) => c.id === a.category) - HANDBOOK_CATEGORIES.findIndex((c) => c.id === b.category) || a.sortOrder - b.sortOrder || a.title.vi.localeCompare(b.title.vi));

// source = "db": dữ liệu đã lưu · "default": bảng trống (hoặc chưa chạy migration) nên dùng bộ mặc định.
export async function listEntries(opt: { publishedOnly?: boolean } = {}): Promise<{ entries: HandbookEntry[]; source: "db" | "default"; error?: string }> {
  try {
    const rows = await selectRows<Row>("smt_handbook", { limit: 2000 });
    if (!rows.length) return { entries: sortEntries(HANDBOOK_SEED), source: "default" };
    const entries = rows.map(fromRow).filter((e) => !opt.publishedOnly || e.status === "published");
    return { entries: sortEntries(entries), source: "db" };
  } catch (error) {
    console.error("[handbook] read failed, using defaults:", error);
    return { entries: sortEntries(HANDBOOK_SEED), source: "default", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getEntry(id: string) {
  const row = await getRow<Row>("smt_handbook", id);
  return row ? fromRow(row) : null;
}

export async function saveEntry(input: Partial<HandbookEntry>, id?: string) {
  const entry = normalizeEntry(input);
  if (!entry.title.vi) throw new HandbookValidationError("Cần nhập tiêu đề (tiếng Việt).");
  if (!entry.slug) throw new HandbookValidationError("Đường dẫn (slug) không hợp lệ.");
  const dup = await selectRows<Row>("smt_handbook", { eq: { slug: entry.slug }, limit: 1 });
  if (dup[0] && dup[0].id !== id) throw new HandbookValidationError(`Đường dẫn "${entry.slug}" đã được dùng cho mục khác.`);
  if (id) {
    const count = await updateRows("smt_handbook", { id }, toRow(entry));
    if (!count) return null;
    return getEntry(id);
  }
  return fromRow((await insertRow("smt_handbook", toRow(entry))) as unknown as Row);
}

export async function deleteEntry(id: string) {
  await deleteRows("smt_handbook", { id });
}

// Chép các mục mặc định chưa có (theo slug) vào database. Không ghi đè mục bạn đã sửa.
export async function importDefaults() {
  const existing = new Set((await selectRows<{ slug: string }>("smt_handbook", { columns: "slug", limit: 5000 })).map((r) => r.slug));
  let added = 0;
  for (const e of HANDBOOK_SEED) {
    if (existing.has(e.slug)) continue;
    await insertRow("smt_handbook", toRow(e));
    added += 1;
  }
  return added;
}
