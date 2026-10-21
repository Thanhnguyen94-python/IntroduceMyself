import { NextResponse } from "next/server";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail } from "@/lib/smt/api-helpers";
import { isDatasetKey, parseDate, type DatasetKey } from "@/lib/smt/datasets";
import { assertCanDelete } from "@/lib/smt/delete-grants";
import { can, type SmtActor } from "@/lib/smt/permissions";
import { deleteDatasetRow, insertDatasetRows, listDataset, updateDatasetRow } from "@/lib/smt/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ dataset: string }> };

// Dùng chung cho Admin (/admin/smt/data) và Trợ lý SMT (/smt/nhap-lieu). Chỉ dữ liệu THẬT.
// Trợ lý xoá cần admin cho phép (delete-grants.ts). Mỗi dòng ghi lại người nhập / sửa (created_by, updated_by).
async function guard(ctx: Ctx): Promise<{ key: DatasetKey; actor: SmtActor } | { error: NextResponse }> {
  const actor = await currentActor();
  if (!can(actor, "data.write")) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const { dataset } = await ctx.params;
  if (!isDatasetKey(dataset)) return { error: NextResponse.json({ message: "Không có bộ dữ liệu này." }, { status: 404 }) };
  return { key: dataset, actor: actor! };
}

// Lỗi nhập liệu -> 400 (hiện cho người nhập), cần xin quyền xoá -> 403 need_grant, lỗi khác -> 500.
const fail = apiFail;

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&line=L1&limit=1000
export async function GET(request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const url = new URL(request.url);
  const from = parseDate(url.searchParams.get("from") ?? "") ?? undefined;
  const to = parseDate(url.searchParams.get("to") ?? "") ?? undefined;
  const line = url.searchParams.get("line")?.trim() || undefined;
  const limit = Math.min(10_000, Math.max(1, Number(url.searchParams.get("limit")) || 5000));
  try {
    return NextResponse.json({ items: await listDataset(g.key, { from, to, line, limit }) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không đọc được dữ liệu.", items: [] }, { status: 500 });
  }
}

// POST {row} hoặc {rows: [...]} (dán nhiều dòng từ Excel). Lỗi 1 dòng -> không ghi dòng nào.
export async function POST(request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as { row?: Record<string, unknown>; rows?: Array<Record<string, unknown>> } | null;
  const rows = body?.rows ?? (body?.row ? [body.row] : []);
  if (!rows.length) return NextResponse.json({ message: "Không có dữ liệu." }, { status: 400 });
  try {
    const items = await insertDatasetRows(g.key, rows, g.actor.name);
    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (error) {
    return fail(error, "Lưu thất bại.");
  }
}

// PATCH {id, ...các trường cần sửa}
export async function PATCH(request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string }) | null;
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  const { id, ...patch } = body;
  try {
    const item = await updateDatasetRow(g.key, String(id), patch, g.actor.name);
    if (!item) return NextResponse.json({ message: "Không tìm thấy bản ghi." }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return fail(error, "Cập nhật thất bại.");
  }
}

// DELETE ?id=... (có thể nhiều: ?id=a&id=b)
export async function DELETE(request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const ids = new URL(request.url).searchParams.getAll("id").filter(Boolean).slice(0, 500);
  if (!ids.length) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await assertCanDelete(g.actor);
    for (const id of ids) await deleteDatasetRow(g.key, id);
    return NextResponse.json({ ok: true, count: ids.length });
  } catch (error) {
    return fail(error, "Xoá thất bại.");
  }
}
